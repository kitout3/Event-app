const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");

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
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(slug)) {
    throw new HttpsError("invalid-argument", "Identifiant de mariage invalide.");
  }
  if (adminPassword.length < 8) {
    throw new HttpsError("invalid-argument", "Le mot de passe temporaire doit contenir au moins 8 caractères.");
  }

  const db = getFirestore();
  const eventRef = db.collection("events").doc(slug);
  const existingEvent = await eventRef.get();
  if (existingEvent.exists) {
    throw new HttpsError("already-exists", "Cet identifiant de mariage existe déjà.");
  }

  let adminUser = null;
  try {
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
    console.error("createWedding:", error);
    if (error instanceof HttpsError) throw error;
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Cette adresse email est déjà utilisée.");
    }
    throw new HttpsError("internal", "Création du mariage impossible.");
  }
});

exports.deleteWedding = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth || request.auth.uid !== PLATFORM_OWNER_UID) {
    throw new HttpsError("permission-denied", "Accès réservé à l’administrateur du logiciel.");
  }

  const eventId = normalizeSlug(request.data?.eventId);
  if (!eventId) throw new HttpsError("invalid-argument", "Mariage invalide.");
  if (eventId === "quentin-huyen-2026") {
    throw new HttpsError("failed-precondition", "Le mariage historique Huyen & Quentin est protégé.");
  }

  const db = getFirestore();
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Mariage introuvable.");

  const data = eventSnap.data() || {};
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
    const [photosSnap, videosSnap] = await Promise.all([
      eventDoc.ref.collection("photos").get(),
      eventDoc.ref.collection("videoTestimonials").get(),
    ]);

    const photoDocs = photosSnap.docs.filter(doc => {
      const type = doc.data().type;
      return type !== "photoLike" && type !== "tvSettings";
    });
    const pendingPhotos = photoDocs.filter(doc => doc.data().status === "pending").length;
    const pendingVideos = videosSnap.docs.filter(doc => doc.data().status === "pending").length;

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
      photoCount: photoDocs.length,
      pendingPhotoCount: pendingPhotos,
      videoCount: videosSnap.size,
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
