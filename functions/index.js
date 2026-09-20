const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");
const eventConfig = require("./event-config");
const billingConfig = require("./billing-config");
const Stripe = require("stripe");

initializeApp();

const PLATFORM_OWNER_UID = "beQK5FNoVla9lnvnzSfqasK93QR2";
const PUBLIC_APP_BASE = String(process.env.PUBLIC_APP_BASE || "https://app.souvenirdemariage.fr/").replace(/\/?$/, "/");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const PRIVATE_EVENT_IDS = new Set(["quentin-huyen-2026"]);

function requestCanAccessPrivateEvent(request, event) {
  if (!PRIVATE_EVENT_IDS.has(String(event?.slug || event?.id || ""))) return true;
  if (!request.auth) return false;
  if (request.auth.uid === PLATFORM_OWNER_UID || request.auth.uid === event.ownerUid) return true;
  const email = String(request.auth.token?.email || "").trim().toLowerCase();
  const allowed = Array.isArray(event.privateAccessEmails) ? event.privateAccessEmails.map(value => String(value || "").trim().toLowerCase()) : [];
  return !!email && allowed.includes(email);
}

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function clientReturnUrl(value) {
  const fallback = new URL("account.html", PUBLIC_APP_BASE).href;
  try {
    const url = new URL(String(value || fallback));
    const allowedHosts = new Set(["app.souvenirdemariage.fr", "kitout3.github.io", "localhost", "127.0.0.1"]);
    const localHttp = (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.protocol === "http:";
    if ((!localHttp && url.protocol !== "https:") || !allowedHosts.has(url.hostname) || !url.pathname.endsWith("/account.html")) return fallback;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return fallback;
  }
}

async function uniqueEventSlug(db, preferred) {
  let base = normalizeSlug(preferred || "evenement");
  if (base.length < 3) base = "evenement";
  let candidate = base;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const ref = db.collection("events").doc(candidate);
    if (!(await ref.get()).exists) return candidate;
    const suffix = Math.random().toString(36).slice(2, 6);
    candidate = (base.slice(0, 74) + "-" + suffix).slice(0, 80);
  }
  throw new HttpsError("already-exists", "Impossible de générer un lien unique. Modifiez légèrement le nom de l’événement.");
}

async function stripeCustomerFor(stripe, uid, email, name) {
  const db = getFirestore();
  const ref = db.collection("customers").doc(uid);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data()?.stripeCustomerId : null;
  if (existing) return existing;

  const customer = await stripe.customers.create({
    email: email || undefined,
    name: name || undefined,
    metadata: { firebaseUid: uid },
  });
  await ref.set({
    stripeCustomerId: customer.id,
    email: email || null,
    name: name || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return customer.id;
}

function sessionObjectId(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id || null;
}

async function finalizeStripeSession(stripe, sessionId, expectedUid = null) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["invoice"] });
  if (session.payment_status !== "paid") return { paid: false, paymentStatus: session.payment_status };

  const eventId = normalizeSlug(session.metadata?.eventId || session.client_reference_id);
  const ownerUid = String(session.metadata?.ownerUid || "");
  if (!eventId || !ownerUid) throw new Error("missing-checkout-metadata");
  if (expectedUid && ownerUid !== expectedUid) throw new HttpsError("permission-denied", "Ce paiement ne correspond pas à votre compte.");

  const db = getFirestore();
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new Error("event-not-found");
  const event = eventSnap.data() || {};
  if (event.ownerUid !== ownerUid) throw new Error("checkout-owner-mismatch");

  let invoice = session.invoice && typeof session.invoice === "object" ? session.invoice : null;
  if (!invoice && session.invoice) invoice = await stripe.invoices.retrieve(session.invoice);

  const billingPatch = {
    ...(event.billing || {}),
    status: "paid",
    checkoutSessionId: session.id,
    paymentIntentId: sessionObjectId(session.payment_intent),
    stripeCustomerId: sessionObjectId(session.customer),
    invoiceId: sessionObjectId(session.invoice),
    invoiceNumber: invoice?.number || null,
    invoiceUrl: invoice?.hosted_invoice_url || null,
    invoicePdf: invoice?.invoice_pdf || null,
    amount: Number(session.amount_total || event.billing?.amount || 0),
    currency: String(session.currency || event.billing?.currency || "eur").toUpperCase(),
    paidAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await eventRef.update({
    billing: billingPatch,
    active: true,
    status: "active",
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { paid: true, eventId, billing: billingPatch };
}

exports.createWedding = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth || request.auth.uid !== PLATFORM_OWNER_UID) {
    throw new HttpsError("permission-denied", "Seul l’administrateur de la plateforme peut créer un événement.");
  }

  const data = request.data || {};
  const name = String(data.name || "").trim();
  const date = String(data.date || "").trim();
  const slug = normalizeSlug(data.slug || name);
  const adminEmail = String(data.adminEmail || "").trim().toLowerCase();
  const adminPassword = String(data.adminPassword || "");

  if (!name || !slug || !adminEmail) {
    throw new HttpsError("invalid-argument", "Nom, identifiant et email administrateur obligatoires.");
  }
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug)) {
    throw new HttpsError("invalid-argument", "Identifiant d’événement invalide.");
  }
  if (adminPassword.length < 8) {
    throw new HttpsError("invalid-argument", "Le mot de passe temporaire doit contenir au moins 8 caractères.");
  }

  let adminUser = null;
  try {
    const db = getFirestore();
    const eventRef = db.collection("events").doc(slug);
    const existingEvent = await eventRef.get();
    if (existingEvent.exists) {
      throw new HttpsError("already-exists", "Cet identifiant d’événement existe déjà.");
    }

    try {
      adminUser = await getAuth().getUserByEmail(adminEmail);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
      adminUser = await getAuth().createUser({
        email: adminEmail,
        password: adminPassword,
        emailVerified: false,
        disabled: false,
        displayName: `Admin · ${name}`,
      });
    }

    const now = FieldValue.serverTimestamp();
    const eventType = eventConfig.eventType(data.eventType);
    const themePreset = eventConfig.themePreset(data.themePreset || data.theme?.preset, eventType);
    const eventModules = eventConfig.modules(data.modules, eventType);
    const location = String(data.location || "").trim().slice(0, 180);
    const organiserName = String(data.organiserName || "").trim().slice(0, 120);
    await eventRef.set({
      id: slug,
      slug,
      name,
      date,
      location,
      organiserName,
      eventType,
      customEventType: eventType === "custom" ? String(data.customEventType || "").trim().slice(0, 120) : "",
      themePreset,
      theme: eventConfig.theme(data.theme, themePreset),
      modules: eventModules,
      labels: eventConfig.labels(data.labels),
      branding: eventConfig.branding(data.branding, organiserName),
      ownerUid: adminUser.uid,
      adminEmail,
      active: true,
      status: "active",
      billing: {
        source: "manual",
        status: "manual",
        planId: "manual",
        planLabel: "Gestion manuelle",
        amount: 0,
        currency: "EUR",
      },
      moderationMode: "immediate",
      displayMode: "mixed",
      coverMessage: eventType === "wedding" ? "Partagez vos plus beaux souvenirs" : "Partagez vos meilleurs moments",
      settings: {
        primary: (eventConfig.THEME_COLORS[themePreset] || eventConfig.THEME_COLORS["custom-neutral"]).primary,
        background: (eventConfig.THEME_COLORS[themePreset] || eventConfig.THEME_COLORS["custom-neutral"]).background,
        showUpload: eventModules.photoUpload,
        showGallery: eventModules.gallery,
        showVideo: eventModules.videoTestimonials,
        showTv: eventModules.tvDisplay,
        showLive: eventModules.live,
        videoModerationMode: "moderated",
        videoDelayMinutes: 60,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: request.auth.uid,
    });

    const guestUrl = `${PUBLIC_APP_BASE}?w=${encodeURIComponent(slug)}`;
    return {
      eventId: slug,
      ownerUid: adminUser.uid,
      guestUrl,
      adminUrl: `${guestUrl}#admin`,
    };
  } catch (error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    console.error("createWedding:", { code, message, stack: error?.stack });

    // Preserve business errors raised above.
    if (error instanceof HttpsError || [
      "invalid-argument", "already-exists", "permission-denied",
      "failed-precondition", "not-found", "unauthenticated"
    ].includes(code)) {
      throw error;
    }

    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Cette adresse email est déjà utilisée.");
    }
    if (code === "auth/invalid-email") {
      throw new HttpsError("invalid-argument", "L’adresse email administrateur n’est pas valide.");
    }
    if (code === "auth/invalid-password" || code === "auth/password-does-not-meet-requirements") {
      throw new HttpsError("invalid-argument", "Le mot de passe temporaire ne respecte pas les règles Firebase. Utilisez au moins 8 caractères avec lettres et chiffres.");
    }
    if (code === "auth/uid-already-exists") {
      throw new HttpsError("already-exists", "Ce compte administrateur existe déjà.");
    }
    if (code.startsWith("auth/")) {
      throw new HttpsError("failed-precondition", `Firebase Auth refuse la création du compte administrateur (${code}).`);
    }
    if (code.startsWith("firestore/") || code.includes("permission")) {
      throw new HttpsError("failed-precondition", `Firestore refuse la création de l’événement (${code || "erreur Firestore"}).`);
    }

    throw new HttpsError(
      "failed-precondition",
      `Création impossible côté serveur (${code || "unknown"}): ${message.slice(0, 180) || "erreur inconnue"}`,
      { sourceCode: code || "unknown", sourceMessage: message.slice(0, 180) }
    );
  }
});

exports.createWeddingV2 = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth || request.auth.uid !== PLATFORM_OWNER_UID) {
    throw new HttpsError("permission-denied", "Accès réservé à l’administrateur du logiciel.");
  }

  let stage = "validation";
  let createdUserUid = null;
  try {
    const data = request.data || {};
    const name = String(data.name || "").trim();
    const date = String(data.date || "").trim();
    const slug = normalizeSlug(data.slug || name);
    const adminEmail = String(data.adminEmail || "").trim().toLowerCase();
    const adminPassword = String(data.adminPassword || "");

    if (!name || !slug || !adminEmail) {
      return { ok: false, stage, code: "invalid-argument", message: "Nom, lien unique et email administrateur obligatoires." };
    }
    if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug)) {
      return { ok: false, stage, code: "invalid-slug", message: "Le lien unique de l’événement est invalide." };
    }
    if (adminPassword.length < 8) {
      return { ok: false, stage, code: "invalid-password", message: "Le mot de passe temporaire doit contenir au moins 8 caractères." };
    }

    stage = "firestore-check";
    const db = getFirestore();
    const eventRef = db.collection("events").doc(slug);
    if ((await eventRef.get()).exists) {
      return { ok: false, stage, code: "already-exists", message: "Cet identifiant d’événement existe déjà." };
    }

    stage = "auth-user";
    let adminUser;
    try {
      adminUser = await getAuth().getUserByEmail(adminEmail);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
      stage = "auth-create-user";
      adminUser = await getAuth().createUser({
        email: adminEmail,
        password: adminPassword,
        emailVerified: false,
        disabled: false,
        displayName: `Admin · ${name}`,
      });
      createdUserUid = adminUser.uid;
    }

    stage = "firestore-create";
    const now = FieldValue.serverTimestamp();
    const eventType = eventConfig.eventType(data.eventType);
    const themePreset = eventConfig.themePreset(data.themePreset || data.theme?.preset, eventType);
    const eventModules = eventConfig.modules(data.modules, eventType);
    const location = String(data.location || "").trim().slice(0, 180);
    const organiserName = String(data.organiserName || "").trim().slice(0, 120);
    await eventRef.set({
      id: slug,
      slug,
      name,
      date,
      location,
      organiserName,
      eventType,
      customEventType: eventType === "custom" ? String(data.customEventType || "").trim().slice(0, 120) : "",
      themePreset,
      theme: eventConfig.theme(data.theme, themePreset),
      modules: eventModules,
      labels: eventConfig.labels(data.labels),
      branding: eventConfig.branding(data.branding, organiserName),
      ownerUid: adminUser.uid,
      adminEmail,
      active: true,
      status: "active",
      billing: {
        source: "manual",
        status: "manual",
        planId: "manual",
        planLabel: "Gestion manuelle",
        amount: 0,
        currency: "EUR",
      },
      moderationMode: "immediate",
      displayMode: "mixed",
      coverMessage: "Partagez vos meilleurs moments",
      settings: {
        primary: (eventConfig.THEME_COLORS[themePreset] || eventConfig.THEME_COLORS["custom-neutral"]).primary,
        background: (eventConfig.THEME_COLORS[themePreset] || eventConfig.THEME_COLORS["custom-neutral"]).background,
        showUpload: eventModules.photoUpload,
        showGallery: eventModules.gallery,
        showVideo: eventModules.videoTestimonials,
        showTv: eventModules.tvDisplay,
        showLive: eventModules.live,
        videoModerationMode: "moderated",
        videoDelayMinutes: 60,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: request.auth.uid,
    });

    const guestUrl = `${PUBLIC_APP_BASE}?w=${encodeURIComponent(slug)}`;
    return {
      ok: true,
      eventId: slug,
      ownerUid: adminUser.uid,
      guestUrl,
      adminUrl: `${guestUrl}#admin`,
    };
  } catch (error) {
    console.error("createWeddingV2:", { stage, code: error?.code, message: error?.message, stack: error?.stack });
    if (createdUserUid) {
      try { await getAuth().deleteUser(createdUserUid); } catch (cleanupError) {
        console.warn("createWeddingV2 cleanup:", cleanupError?.code || cleanupError?.message);
      }
    }
    return {
      ok: false,
      stage,
      code: String(error?.code || "unknown"),
      message: String(error?.message || "Erreur serveur inconnue.").slice(0, 250),
    };
  }
});

exports.listPublicVideos = onCall({ region: "europe-west1" }, async request => {
  const eventId = normalizeSlug(request.data?.eventId);
  if (!eventId) {
    throw new HttpsError("invalid-argument", "Événement invalide.");
  }

  const db = getFirestore();
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists || eventSnap.data()?.active === false) {
    return { videos: [] };
  }
  const eventData = { id: eventSnap.id, slug: eventSnap.id, ...(eventSnap.data() || {}) };
  if (!requestCanAccessPrivateEvent(request, eventData)) {
    throw new HttpsError("permission-denied", "Cet événement est privé.");
  }

  const now = Date.now();
  const snap = await eventRef.collection("videoTestimonials").get();
  const videos = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(video => {
      if (!video.url) return false;
      if (video.status === "approved") return true;
      const publishAt = video.publishAt?.toDate?.()?.getTime?.()
        ?? (video.publishAt ? Date.parse(String(video.publishAt)) : NaN);
      return video.status === "pending"
        && video.moderationMode === "delayed"
        && Number.isFinite(publishAt)
        && publishAt <= now;
    })
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
      return bTime - aTime;
    })
    .map(video => ({
      id: video.id,
      url: video.url,
      author: video.author || null,
      message: video.message || null,
      duration: Number(video.duration) || 0,
      size: Number(video.size) || 0,
      mimeType: video.mimeType || "video/mp4",
      status: video.status || "approved",
      moderationMode: video.moderationMode || "moderated",
      publishAt: video.publishAt?.toDate?.()?.toISOString?.() || null,
      createdAt: video.createdAt?.toDate?.()?.toISOString?.() || null,
      selectedForTv: video.selectedForTv === true,
    }));

  return { videos };
});

exports.updateWedding = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth || request.auth.uid !== PLATFORM_OWNER_UID) {
    throw new HttpsError("permission-denied", "Accès réservé à l’administrateur du logiciel.");
  }

  const eventId = normalizeSlug(request.data?.eventId);
  if (!eventId) throw new HttpsError("invalid-argument", "Événement invalide.");

  const patch = {};
  if (typeof request.data?.name === "string") {
    const name = request.data.name.trim();
    if (!name) throw new HttpsError("invalid-argument", "Le nom de l’événement est obligatoire.");
    patch.name = name.slice(0, 120);
  }
  if (typeof request.data?.date === "string") patch.date = request.data.date.trim().slice(0, 120);
  if (typeof request.data?.location === "string") patch.location = request.data.location.trim().slice(0, 180);
  if (typeof request.data?.organiserName === "string") patch.organiserName = request.data.organiserName.trim().slice(0, 120);
  if (typeof request.data?.active === "boolean") patch.active = request.data.active;

  if (typeof request.data?.eventType === "string") {
    patch.eventType = eventConfig.eventType(request.data.eventType);
    patch.customEventType = patch.eventType === "custom" ? String(request.data?.customEventType || "").trim().slice(0, 120) : "";
  }
  const configType = patch.eventType || eventConfig.eventType(request.data?.currentEventType);
  if (request.data?.themePreset || request.data?.theme) {
    patch.themePreset = eventConfig.themePreset(request.data?.themePreset || request.data?.theme?.preset, configType);
    patch.theme = eventConfig.theme(request.data?.theme, patch.themePreset);
  }
  if (request.data?.modules && typeof request.data.modules === "object") patch.modules = eventConfig.modules(request.data.modules, configType);
  if (request.data?.labels && typeof request.data.labels === "object") patch.labels = eventConfig.labels(request.data.labels);
  if (request.data?.branding && typeof request.data.branding === "object") patch.branding = eventConfig.branding(request.data.branding, request.data?.organiserName);
  if (!Object.keys(patch).length) {
    throw new HttpsError("invalid-argument", "Aucune modification fournie.");
  }

  const ref = getFirestore().collection("events").doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Événement introuvable.");

  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  return { updated: true, eventId, ...patch };
});

exports.deleteWedding = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth || request.auth.uid !== PLATFORM_OWNER_UID) {
    throw new HttpsError("permission-denied", "Accès réservé à l’administrateur du logiciel.");
  }

  const eventId = normalizeSlug(request.data?.eventId);
  if (!eventId) throw new HttpsError("invalid-argument", "Événement invalide.");
  const db = getFirestore();
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Événement introuvable.");

  const data = eventSnap.data() || {};

  // Delete every uploaded object for this tenant before removing Firestore
  // metadata, so a deleted wedding cannot leave billable/orphaned media.
  try {
    await getStorage().bucket().deleteFiles({ prefix: `events/${eventId}/` });
  } catch (error) {
    console.error("deleteWedding storage:", eventId, error);
    throw new HttpsError("internal", "Impossible de supprimer les fichiers de l’événement. Réessayez.");
  }

  await db.recursiveDelete(eventRef);

  // The account is intentionally preserved: one customer can own several events.
  return { deleted: true, eventId };
});

exports.listWeddings = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth || request.auth.uid !== PLATFORM_OWNER_UID) {
    throw new HttpsError("permission-denied", "Accès réservé à l’administrateur du logiciel.");
  }

  const db = getFirestore();
  const snapshot = await db.collection("events").get();
  const eventDocs = snapshot.docs.filter(doc => {
    const data = doc.data();
    // Legacy Huyen & Quentin data predates the SaaS owner/slug metadata.
    // Include every actual event document and normalize missing metadata below.
    return Boolean(doc.id && data);
  });

  const weddings = await Promise.all(eventDocs.map(async eventDoc => {
    const data = eventDoc.data();
    const photosRef = eventDoc.ref.collection("photos");
    const videosRef = eventDoc.ref.collection("videoTestimonials");
    const [
      totalPhotosAgg,
      photoLikesAgg,
      tvSettingsAgg,
      pendingPhotosAgg,
      totalVideosAgg,
      pendingVideosAgg,
    ] = await Promise.all([
      photosRef.count().get(),
      photosRef.where("type", "==", "photoLike").count().get(),
      photosRef.where("type", "==", "tvSettings").count().get(),
      photosRef.where("status", "==", "pending").count().get(),
      videosRef.count().get(),
      videosRef.where("status", "==", "pending").count().get(),
    ]);

    const totalPhotoDocs = totalPhotosAgg.data().count || 0;
    const photoLikes = photoLikesAgg.data().count || 0;
    const tvSettings = tvSettingsAgg.data().count || 0;
    const photoCount = Math.max(0, totalPhotoDocs - photoLikes - tvSettings);
    const pendingPhotos = pendingPhotosAgg.data().count || 0;
    const videoCount = totalVideosAgg.data().count || 0;
    const pendingVideos = pendingVideosAgg.data().count || 0;

    let adminEmail = data.adminEmail || "";
    if (!adminEmail && data.ownerUid) {
      try {
        const owner = await getAuth().getUser(data.ownerUid);
        adminEmail = owner.email || "";
      } catch (error) {
        console.warn("Impossible de lire l’email admin", eventDoc.id, error?.code || error?.message);
      }
    }

    const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || null;
    const updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() || null;
    const slug = data.slug || eventDoc.id;
    const isLegacyWedding = slug === "quentin-huyen-2026";
    const guestUrl = `${PUBLIC_APP_BASE}?w=${encodeURIComponent(slug)}`;

    return {
      id: eventDoc.id,
      slug,
      name: data.name || (isLegacyWedding ? "Huyen & Quentin" : slug),
      date: data.date || (isLegacyWedding ? "12 – 13 Septembre 2026" : ""),
      location: data.location || "",
      organiserName: data.organiserName || data.branding?.organisationName || "",
      eventType: eventConfig.eventType(data.eventType || (isLegacyWedding ? "wedding" : "custom")),
      customEventType: data.customEventType || "",
      themePreset: eventConfig.themePreset(data.themePreset || data.theme?.preset, data.eventType || (isLegacyWedding ? "wedding" : "custom")),
      theme: data.theme || null,
      modules: data.modules || null,
      active: data.active !== false,
      status: data.status || (data.active !== false ? "active" : "draft"),
      billing: data.billing || null,
      ownerUid: data.ownerUid || (isLegacyWedding ? PLATFORM_OWNER_UID : null),
      adminEmail,
      photoCount,
      pendingPhotoCount: pendingPhotos,
      videoCount,
      pendingVideoCount: pendingVideos,
      createdAt,
      updatedAt,
      guestUrl,
      adminUrl: `${guestUrl}#admin`,
    };
  }));

  weddings.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime || a.name.localeCompare(b.name, "fr");
  });

  return { weddings };
});


exports.createClientEventDraft = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Connectez-vous pour créer un événement.");

  const data = request.data || {};
  const name = String(data.name || "").trim().slice(0, 120);
  const date = String(data.date || "").trim().slice(0, 120);
  if (!name || !date) throw new HttpsError("invalid-argument", "Nom et date de l’événement sont obligatoires.");

  const eventType = eventConfig.eventType(data.eventType);
  const themePreset = eventConfig.themePreset(data.themePreset || data.theme?.preset, eventType);
  const eventModules = eventConfig.modules(data.modules, eventType);
  let quote;
  try { quote = billingConfig.quote(data.planId || "event", eventType); }
  catch { throw new HttpsError("invalid-argument", "Formule de paiement invalide."); }

  const db = getFirestore();
  const slug = await uniqueEventSlug(db, data.slug || name);
  const ref = db.collection("events").doc(slug);
  const ownerUid = request.auth.uid;
  const adminEmail = String(request.auth.token?.email || "").trim().toLowerCase();
  const organiserName = String(data.organiserName || request.auth.token?.name || "").trim().slice(0, 120);
  const location = String(data.location || "").trim().slice(0, 180);
  const now = FieldValue.serverTimestamp();
  const theme = eventConfig.theme(data.theme, themePreset);

  await ref.create({
    id: slug,
    slug,
    name,
    date,
    location,
    organiserName,
    eventType,
    customEventType: eventType === "custom" ? String(data.customEventType || "").trim().slice(0, 120) : "",
    themePreset,
    theme,
    modules: eventModules,
    labels: eventConfig.labels(data.labels),
    branding: eventConfig.branding(data.branding, organiserName),
    ownerUid,
    adminEmail,
    active: false,
    status: "payment_pending",
    moderationMode: "immediate",
    displayMode: "mixed",
    coverMessage: eventType === "wedding" ? "Partagez vos plus beaux souvenirs" : "Partagez vos meilleurs moments",
    settings: {
      primary: theme.primary,
      background: theme.background,
      showUpload: eventModules.photoUpload,
      showGallery: eventModules.gallery,
      showVideo: eventModules.videoTestimonials,
      showTv: eventModules.tvDisplay,
      showLive: eventModules.live,
      videoModerationMode: "moderated",
      videoDelayMinutes: 60,
    },
    billing: {
      source: "stripe",
      status: "unpaid",
      planId: quote.planId,
      planLabel: quote.planLabel,
      segment: quote.segment,
      amount: quote.amount,
      currency: quote.currency.toUpperCase(),
      checkoutSessionId: null,
      invoiceId: null,
      invoiceUrl: null,
      invoicePdf: null,
    },
    createdAt: now,
    updatedAt: now,
    createdBy: ownerUid,
  });

  return {
    eventId: slug,
    slug,
    status: "payment_pending",
    billing: { ...quote, currency: quote.currency.toUpperCase(), status: "unpaid" },
  };
});

exports.listMyEvents = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Connectez-vous pour accéder à vos événements.");
  const db = getFirestore();
  const ownedSnapshot = await db.collection("events").where("ownerUid", "==", request.auth.uid).get();
  const email = String(request.auth.token?.email || "").trim().toLowerCase();
  const sharedSnapshot = email
    ? await db.collection("events").where("privateAccessEmails", "array-contains", email).get()
    : null;
  const docsById = new Map();
  ownedSnapshot.docs.forEach(doc => docsById.set(doc.id, doc));
  sharedSnapshot?.docs.forEach(doc => docsById.set(doc.id, doc));
  const events = [...docsById.values()].map(doc => {
    const data = doc.data() || {};
    const slug = data.slug || doc.id;
    const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || null;
    const updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() || null;
    return {
      id: doc.id,
      slug,
      name: data.name || slug,
      date: data.date || "",
      location: data.location || "",
      organiserName: data.organiserName || "",
      eventType: eventConfig.eventType(data.eventType || "custom"),
      customEventType: data.customEventType || "",
      themePreset: eventConfig.themePreset(data.themePreset || data.theme?.preset, data.eventType || "custom"),
      active: data.active === true,
      status: data.status || (data.active === true ? "active" : "draft"),
      billing: data.billing || null,
      createdAt,
      updatedAt,
      guestUrl: PUBLIC_APP_BASE + "?w=" + encodeURIComponent(slug),
      adminUrl: PUBLIC_APP_BASE + "?w=" + encodeURIComponent(slug) + "#admin",
    };
  });
  events.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime || a.name.localeCompare(b.name, "fr");
  });
  return { events };
});

exports.createEventCheckoutSession = onCall(
  { region: "europe-west1", secrets: [STRIPE_SECRET_KEY] },
  async request => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Connectez-vous pour payer votre événement.");
    const eventId = normalizeSlug(request.data?.eventId);
    if (!eventId) throw new HttpsError("invalid-argument", "Événement invalide.");

    const db = getFirestore();
    const eventRef = db.collection("events").doc(eventId);
    const snap = await eventRef.get();
    if (!snap.exists) throw new HttpsError("not-found", "Événement introuvable.");
    const event = snap.data() || {};
    if (event.ownerUid !== request.auth.uid) throw new HttpsError("permission-denied", "Cet événement ne vous appartient pas.");
    if (event.billing?.status === "paid") return { alreadyPaid: true, eventId };
    if (event.billing?.source !== "stripe") throw new HttpsError("failed-precondition", "Cet événement utilise une facturation gérée manuellement.");

    let quote;
    try { quote = billingConfig.quote(event.billing?.planId, event.eventType); }
    catch { throw new HttpsError("failed-precondition", "La formule de cet événement n’est plus disponible."); }

    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const customerId = await stripeCustomerFor(
      stripe,
      request.auth.uid,
      request.auth.token?.email || event.adminEmail || null,
      request.auth.token?.name || event.organiserName || null
    );
    const returnUrl = clientReturnUrl(request.data?.returnUrl);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: eventId,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: quote.currency,
          unit_amount: quote.amount,
          product_data: {
            name: "Event-App · " + quote.planLabel,
            description: event.name + " · paiement unique par événement",
          },
        },
      }],
      billing_address_collection: "required",
      allow_promotion_codes: true,
      invoice_creation: { enabled: true },
      metadata: {
        eventId,
        ownerUid: request.auth.uid,
        planId: quote.planId,
      },
      payment_intent_data: {
        metadata: { eventId, ownerUid: request.auth.uid, planId: quote.planId },
      },
      success_url: returnUrl + "?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: returnUrl + "?checkout=cancelled&event=" + encodeURIComponent(eventId),
    });

    await eventRef.update({
      "billing.status": "payment_pending",
      "billing.planLabel": quote.planLabel,
      "billing.segment": quote.segment,
      "billing.amount": quote.amount,
      "billing.currency": quote.currency.toUpperCase(),
      "billing.checkoutSessionId": session.id,
      "billing.stripeCustomerId": customerId,
      "billing.updatedAt": FieldValue.serverTimestamp(),
      status: "payment_pending",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { url: session.url, sessionId: session.id, eventId };
  }
);

exports.confirmEventCheckout = onCall(
  { region: "europe-west1", secrets: [STRIPE_SECRET_KEY] },
  async request => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Connectez-vous pour confirmer le paiement.");
    const sessionId = String(request.data?.sessionId || "").trim();
    if (!sessionId.startsWith("cs_")) throw new HttpsError("invalid-argument", "Session de paiement invalide.");
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const result = await finalizeStripeSession(stripe, sessionId, request.auth.uid);
    if (!result.paid) throw new HttpsError("failed-precondition", "Le paiement n’est pas encore confirmé.");
    return { paid: true, eventId: result.eventId };
  }
);

exports.stripeWebhook = onRequest(
  { region: "europe-west1", secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    let webhookEvent;
    try {
      webhookEvent = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers["stripe-signature"],
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (error) {
      console.warn("stripeWebhook signature:", error?.message);
      res.status(400).send("Invalid signature");
      return;
    }

    try {
      const session = webhookEvent.data?.object;
      if (
        ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(webhookEvent.type)
        && session?.id
      ) {
        await finalizeStripeSession(stripe, session.id);
      } else if (webhookEvent.type === "checkout.session.expired" && session?.id) {
        const eventId = normalizeSlug(session.metadata?.eventId || session.client_reference_id);
        if (eventId) {
          const ref = getFirestore().collection("events").doc(eventId);
          const snap = await ref.get();
          if (snap.exists && snap.data()?.billing?.checkoutSessionId === session.id && snap.data()?.billing?.status !== "paid") {
            await ref.update({
              "billing.status": "unpaid",
              "billing.updatedAt": FieldValue.serverTimestamp(),
              status: "payment_pending",
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      }
      res.json({ received: true });
    } catch (error) {
      console.error("stripeWebhook processing:", error);
      res.status(500).send("Webhook processing failed");
    }
  }
);

exports.notifyNewPendingVideoV2 = onDocumentCreated(
  { document: "events/{eventId}/videoTestimonials/{videoId}", region: "europe-west1" },
  async event => {
    const { eventId, videoId } = event.params;
    const video = event.data?.data();

    console.log("Nouvelle vidéo détectée", {
      eventId,
      videoId,
      status: video?.status,
      author: video?.author || null,
    });

    if (!video || video.status !== "pending") return;

    const db = getFirestore();
    const subscriptions = await db
      .collection("events").doc(eventId)
      .collection("pushSubscriptions")
      .where("enabled", "==", true)
      .get();

    const recipients = subscriptions.docs
      .map(doc => ({ docId: doc.id, token: doc.data().token }))
      .filter(item => item.token);

    if (!recipients.length) {
      await event.data.ref.update({
        notificationAttemptedAt: FieldValue.serverTimestamp(),
        notificationSuccessCount: 0,
        notificationFailureCount: 0,
      });
      return;
    }

    const author = video.author ? ` de ${video.author}` : "";
    const adminUrl = `${PUBLIC_APP_BASE}?w=${encodeURIComponent(eventId)}#admin`;
    const response = await getMessaging().sendEachForMulticast({
      tokens: recipients.map(item => item.token),
      notification: {
        title: "Nouvelle vidéo à valider",
        body: `Une nouvelle vidéo${author} attend votre validation.`,
      },
      data: {
        url: adminUrl,
        eventId,
        videoId,
      },
      webpush: {
        notification: {
          title: "Nouvelle vidéo à valider",
          body: `Une nouvelle vidéo${author} attend votre validation.`,
          icon: `${PUBLIC_APP_BASE}icons/icon-192.png`,
          badge: `${PUBLIC_APP_BASE}icons/icon-192.png`,
        },
        fcmOptions: { link: adminUrl },
      },
    });

    const removals = [];
    response.responses.forEach((result, index) => {
      if (
        !result.success &&
        ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(result.error?.code)
      ) {
        removals.push(
          db.collection("events").doc(eventId)
            .collection("pushSubscriptions").doc(recipients[index].docId).delete()
        );
      }
    });
    await Promise.all(removals);

    await event.data.ref.update({
      notificationSentAt: FieldValue.serverTimestamp(),
      notificationSuccessCount: response.successCount,
      notificationFailureCount: response.failureCount,
    });
  }
);
