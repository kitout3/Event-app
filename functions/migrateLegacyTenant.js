const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "mariage-hq";
const EVENT_ID = "quentin-huyen-2026";
const OWNER_UID = "beQK5FNoVla9lnvnzSfqasK93QR2";

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

async function copyCollection(sourcePath, targetPath, transform = data => data) {
  const source = db.collection(sourcePath);
  const target = db.collection(targetPath);
  const snap = await source.get();
  if (snap.empty) {
    console.log(`- ${sourcePath}: 0 document`);
    return 0;
  }

  let batch = db.batch();
  let pending = 0;
  let copied = 0;

  for (const doc of snap.docs) {
    const data = transform(doc.data(), doc.id);
    batch.set(target.doc(doc.id), data, { merge: true });
    pending += 1;
    copied += 1;

    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  console.log(`- ${sourcePath}: ${copied} document(s) copié(s) vers ${targetPath}`);
  return copied;
}

async function main() {
  console.log(`Projet: ${PROJECT_ID}`);
  console.log(`Migration vers events/${EVENT_ID}`);

  const legacyLiveRef = db.collection("events").doc("mariage-live");
  const legacyLiveSnap = await legacyLiveRef.get();
  const legacyLive = legacyLiveSnap.exists ? legacyLiveSnap.data() : {};

  const eventRef = db.collection("events").doc(EVENT_ID);
  await eventRef.set({
    id: EVENT_ID,
    slug: EVENT_ID,
    name: "Huyen & Quentin",
    date: "12 – 13 Septembre 2026",
    ownerUid: OWNER_UID,
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
      videoDelayMinutes: 60
    },
    ...(legacyLive.liveUrl ? { liveUrl: legacyLive.liveUrl } : {}),
    ...(legacyLive.playerUrl ? { playerUrl: legacyLive.playerUrl } : {}),
    ...(legacyLive.eventTime ? { eventTime: legacyLive.eventTime } : {}),
    ...(legacyLive.location ? { location: legacyLive.location } : {}),
    migratedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`- event events/${EVENT_ID}: prêt`);

  await copyCollection("photos", `events/${EVENT_ID}/photos`, data => ({
    ...data,
    eventId: EVENT_ID,
    legacyEventId: data.eventId || null
  }));

  await copyCollection("videoTestimonials", `events/${EVENT_ID}/videoTestimonials`, data => ({
    ...data,
    eventId: EVENT_ID,
    legacyEventId: data.eventId || null
  }));

  await copyCollection("pushSubscriptions", `events/${EVENT_ID}/pushSubscriptions`, data => ({
    ...data,
    eventId: EVENT_ID
  }));

  await copyCollection("liveChatMessages", `events/${EVENT_ID}/liveChatMessages`, data => ({
    ...data,
    eventId: EVENT_ID
  }));

  const eventSnap = await eventRef.get();
  const photoCount = (await eventRef.collection("photos").get()).size;
  const videoCount = (await eventRef.collection("videoTestimonials").get()).size;

  console.log("");
  console.log("Vérification:");
  console.log(`- ownerUid: ${eventSnap.data().ownerUid}`);
  console.log(`- photos: ${photoCount}`);
  console.log(`- vidéos: ${videoCount}`);
  console.log("");
  console.log("Migration terminée. Les anciennes collections n'ont PAS été supprimées.");
}

main().catch(error => {
  console.error("Migration échouée:", error);
  process.exitCode = 1;
});
