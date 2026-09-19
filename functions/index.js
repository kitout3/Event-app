const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");

initializeApp();

const PLATFORM_OWNER_UID = "beQK5FNoVla9lnvnzSfqasK93QR2";
const PUBLIC_APP_BASE = "https://kitout3.github.io/mariage-app/";

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

exports.createWedding = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth || request.auth.uid !== PLATFORM_OWNER_UID) {
    throw new HttpsError("permission-denied", "Seul l’administrateur de la plateforme peut créer un mariage.");
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
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    throw new HttpsError("invalid-argument", "Identifiant de mariage invalide.");
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
      throw new HttpsError("already-exists", "Cet identifiant de mariage existe déjà.");
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

    const alreadyOwned = await db.collection("events").where("ownerUid", "==", adminUser.uid).limit(1).get();
    if (!alreadyOwned.empty) {
      throw new HttpsError(
        "already-exists",
        "Ce compte admin est déjà associé à un mariage. Utilisez une autre adresse email pour garantir l’indépendance des espaces."
      );
    }

    const now = FieldValue.serverTimestamp();
    await eventRef.set({
      id: slug,
      slug,
      name,
      date,
      ownerUid: adminUser.uid,
      adminEmail,
      active: true,
      moderationMode: "immediate",
      displayMode: "mixed",
      coverMessage: "Partagez vos plus beaux souvenirs",
      settings: {
        primary: "#5c2a1e",
        background: "#fdf8f4",
        showUpload: true,
        showGallery: true,
        showVideo: true,
        showTv: true,
        showLive: true,
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
      throw new HttpsError("failed-precondition", `Firestore refuse la création du mariage (${code || "erreur Firestore"}).`);
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
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
      return { ok: false, stage, code: "invalid-slug", message: "Le lien unique du mariage est invalide." };
    }
    if (adminPassword.length < 8) {
      return { ok: false, stage, code: "invalid-password", message: "Le mot de passe temporaire doit contenir au moins 8 caractères." };
    }

    stage = "firestore-check";
    const db = getFirestore();
    const eventRef = db.collection("events").doc(slug);
    if ((await eventRef.get()).exists) {
      return { ok: false, stage, code: "already-exists", message: "Cet identifiant de mariage existe déjà." };
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

    stage = "ownership-check";
    const alreadyOwned = await db.collection("events").where("ownerUid", "==", adminUser.uid).limit(1).get();
    if (!alreadyOwned.empty) {
      if (createdUserUid) {
        try { await getAuth().deleteUser(createdUserUid); } catch (_) {}
        createdUserUid = null;
      }
      return {
        ok: false,
        stage,
        code: "admin-already-used",
        message: "Ce compte administrateur est déjà associé à un mariage. Utilisez une autre adresse email.",
      };
    }

    stage = "firestore-create";
    const now = FieldValue.serverTimestamp();
    await eventRef.set({
      id: slug,
      slug,
      name,
      date,
      ownerUid: adminUser.uid,
      adminEmail,
      active: true,
      moderationMode: "immediate",
      displayMode: "mixed",
      coverMessage: "Partagez vos plus beaux souvenirs",
      settings: {
        primary: "#5c2a1e",
        background: "#fdf8f4",
        showUpload: true,
        showGallery: true,
        showVideo: true,
        showTv: true,
        showLive: true,
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
    throw new HttpsError("invalid-argument", "Mariage invalide.");
  }

  const db = getFirestore();
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists || eventSnap.data()?.active === false) {
    return { videos: [] };
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
  if (!eventId) throw new HttpsError("invalid-argument", "Mariage invalide.");

  const patch = {};
  if (typeof request.data?.name === "string") {
    const name = request.data.name.trim();
    if (!name) throw new HttpsError("invalid-argument", "Le nom du mariage est obligatoire.");
    patch.name = name.slice(0, 120);
  }
  if (typeof request.data?.date === "string") {
    patch.date = request.data.date.trim().slice(0, 120);
  }
  if (typeof request.data?.active === "boolean") {
    patch.active = request.data.active;
  }
  if (!Object.keys(patch).length) {
    throw new HttpsError("invalid-argument", "Aucune modification fournie.");
  }

  const ref = getFirestore().collection("events").doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Mariage introuvable.");

  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  return { updated: true, eventId, ...patch };
});

exports.deleteWedding = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth || request.auth.uid !== PLATFORM_OWNER_UID) {
    throw new HttpsError("permission-denied", "Accès réservé à l’administrateur du logiciel.");
  }

  const eventId = normalizeSlug(request.data?.eventId);
  if (!eventId) throw new HttpsError("invalid-argument", "Mariage invalide.");
  const db = getFirestore();
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Mariage introuvable.");

  const data = eventSnap.data() || {};

  // Delete every uploaded object for this tenant before removing Firestore
  // metadata, so a deleted wedding cannot leave billable/orphaned media.
  try {
    await getStorage().bucket().deleteFiles({ prefix: `events/${eventId}/` });
  } catch (error) {
    console.error("deleteWedding storage:", eventId, error);
    throw new HttpsError("internal", "Impossible de supprimer les fichiers du mariage. Réessayez.");
  }

  await db.recursiveDelete(eventRef);

  if (data.ownerUid && data.ownerUid !== PLATFORM_OWNER_UID) {
    try { await getAuth().deleteUser(data.ownerUid); }
    catch (error) { console.warn("Compte admin non supprimé", data.ownerUid, error?.code || error?.message); }
  }
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
      active: data.active !== false,
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
