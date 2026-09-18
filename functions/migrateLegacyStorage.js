const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const crypto = require("crypto");

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "mariage-hq";
const BUCKET_NAME = process.env.STORAGE_BUCKET || "mariage-hq.firebasestorage.app";
const EVENT_ID = "quentin-huyen-2026";
const LEGACY_PREFIXES = ["events/mariage-2025/", "events/mariage-2026/"];

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME,
});

const db = getFirestore();
const bucket = getStorage().bucket();

function extractStoragePath(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    const marker = "/o/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function isLegacyPath(path) {
  return !!path && LEGACY_PREFIXES.some(prefix => path.startsWith(prefix));
}

function destinationFor(oldPath) {
  for (const prefix of LEGACY_PREFIXES) {
    if (oldPath.startsWith(prefix)) {
      const legacyId = prefix.split("/")[1];
      return `events/${EVENT_ID}/legacy/${legacyId}/${oldPath.slice(prefix.length)}`;
    }
  }
  return oldPath;
}

const cache = new Map();

async function migrateObject(oldPath) {
  if (!isLegacyPath(oldPath)) return null;
  if (cache.has(oldPath)) return cache.get(oldPath);

  const promise = (async () => {
    const newPath = destinationFor(oldPath);
    const source = bucket.file(oldPath);
    const [exists] = await source.exists();
    if (!exists) {
      console.warn(`  ! Fichier introuvable: ${oldPath}`);
      return null;
    }

    const dest = bucket.file(newPath);
    const [destExists] = await dest.exists();
    if (!destExists) {
      await source.copy(dest);
    }

    let [metadata] = await dest.getMetadata();
    let token = metadata.metadata?.firebaseStorageDownloadTokens;
    if (!token) {
      token = crypto.randomUUID();
      await dest.setMetadata({
        metadata: {
          ...(metadata.metadata || {}),
          firebaseStorageDownloadTokens: token,
          migratedFrom: oldPath,
          eventId: EVENT_ID,
        },
      });
      [metadata] = await dest.getMetadata();
    }

    const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(newPath)}?alt=media&token=${encodeURIComponent(token)}`;
    return { path: newPath, url };
  })();

  cache.set(oldPath, promise);
  return promise;
}

async function migratePhotos() {
  const ref = db.collection("events").doc(EVENT_ID).collection("photos");
  const snap = await ref.get();
  let updated = 0;
  let scanned = 0;

  for (const doc of snap.docs) {
    scanned += 1;
    const data = doc.data();
    const patch = {};

    const previewPath = extractStoragePath(data.url) || extractStoragePath(data.thumbnail);
    if (isLegacyPath(previewPath)) {
      const migrated = await migrateObject(previewPath);
      if (migrated) {
        patch.url = migrated.url;
        patch.thumbnail = migrated.url;
        patch.previewPath = migrated.path;
      }
    }

    const originalPath = data.originalPath || extractStoragePath(data.originalUrl);
    if (isLegacyPath(originalPath)) {
      const migrated = await migrateObject(originalPath);
      if (migrated) {
        patch.originalPath = migrated.path;
        patch.originalUrl = migrated.url;
      }
    }

    if (Object.keys(patch).length) {
      patch.storageMigratedAt = FieldValue.serverTimestamp();
      await doc.ref.update(patch);
      updated += 1;
    }

    if (scanned % 25 === 0 || scanned === snap.size) {
      console.log(`Photos: ${scanned}/${snap.size} analysées, ${updated} mises à jour`);
    }
  }

  return { scanned, updated };
}

async function migrateVideos() {
  const ref = db.collection("events").doc(EVENT_ID).collection("videoTestimonials");
  const snap = await ref.get();
  let updated = 0;
  let scanned = 0;

  for (const doc of snap.docs) {
    scanned += 1;
    const data = doc.data();
    const oldPath = data.path || extractStoragePath(data.url);
    if (isLegacyPath(oldPath)) {
      const migrated = await migrateObject(oldPath);
      if (migrated) {
        await doc.ref.update({
          path: migrated.path,
          url: migrated.url,
          storageMigratedAt: FieldValue.serverTimestamp(),
        });
        updated += 1;
      }
    }

    if (scanned % 10 === 0 || scanned === snap.size) {
      console.log(`Vidéos: ${scanned}/${snap.size} analysées, ${updated} mises à jour`);
    }
  }

  return { scanned, updated };
}

async function verifyNoLegacyReferences() {
  const photos = await db.collection("events").doc(EVENT_ID).collection("photos").get();
  const videos = await db.collection("events").doc(EVENT_ID).collection("videoTestimonials").get();

  let photoLegacy = 0;
  let videoLegacy = 0;

  for (const doc of photos.docs) {
    const d = doc.data();
    const paths = [
      extractStoragePath(d.url),
      extractStoragePath(d.thumbnail),
      d.originalPath,
      extractStoragePath(d.originalUrl),
    ].filter(Boolean);
    if (paths.some(isLegacyPath)) photoLegacy += 1;
  }

  for (const doc of videos.docs) {
    const d = doc.data();
    const paths = [d.path, extractStoragePath(d.url)].filter(Boolean);
    if (paths.some(isLegacyPath)) videoLegacy += 1;
  }

  return { photoLegacy, videoLegacy };
}

async function main() {
  console.log(`Projet: ${PROJECT_ID}`);
  console.log(`Bucket: ${bucket.name}`);
  console.log(`Migration Storage vers events/${EVENT_ID}/legacy/...\n`);

  const photoResult = await migratePhotos();
  const videoResult = await migrateVideos();
  const verify = await verifyNoLegacyReferences();

  console.log("\nRésultat:");
  console.log(`- Photos analysées: ${photoResult.scanned}, mises à jour: ${photoResult.updated}`);
  console.log(`- Vidéos analysées: ${videoResult.scanned}, mises à jour: ${videoResult.updated}`);
  console.log(`- Photos encore liées à un ancien chemin: ${verify.photoLegacy}`);
  console.log(`- Vidéos encore liées à un ancien chemin: ${verify.videoLegacy}`);

  if (verify.photoLegacy || verify.videoLegacy) {
    process.exitCode = 2;
    console.error("\nMigration incomplète: ne déployez pas encore les nouvelles règles Storage.");
  } else {
    console.log("\nMigration Storage terminée. Les anciens fichiers n'ont PAS été supprimés.");
  }
}

main().catch(error => {
  console.error("Migration Storage échouée:", error);
  process.exitCode = 1;
});
