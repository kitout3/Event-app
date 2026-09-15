const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const crypto = require('crypto');

initializeApp();

const EVENT_ID = 'mariage-2026';
const APP_URL = 'https://kitout3.github.io/mariage-app/';
const APP_ORIGIN = 'https://kitout3.github.io';
const MAX_SELECTION_SIZE = 200;
const SELECTION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

function allowCors(response) {
  response.set('Access-Control-Allow-Origin', APP_ORIGIN);
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  response.set('Cache-Control', 'no-store');
}

function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeFileName(value, fallback) {
  const cleaned = String(value || fallback).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 120);
  return cleaned || fallback;
}

async function resolveApprovedMedia(db, requestedItems) {
  const unique = new Map();
  requestedItems.forEach(item => {
    if (!item || !['photo', 'video'].includes(item.kind) || typeof item.id !== 'string' || item.id.length > 160) return;
    unique.set(`${item.kind}:${item.id}`, { kind: item.kind, id: item.id });
  });

  if (!unique.size || unique.size > MAX_SELECTION_SIZE) throw new Error('INVALID_SELECTION');

  const resolved = await Promise.all([...unique.values()].map(async item => {
    const collection = item.kind === 'photo' ? 'photos' : 'videoTestimonials';
    const snapshot = await db.collection(collection).doc(item.id).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data();
    if (data.status !== 'approved') return null;
    if (data.eventId && !['mariage-2025', EVENT_ID].includes(data.eventId)) return null;
    const url = item.kind === 'photo' ? (data.originalUrl || data.url) : data.url;
    if (typeof url !== 'string' || !url.startsWith('https://')) return null;
    const extension = item.kind === 'video'
      ? ((data.mimeType || '').includes('quicktime') ? 'mov' : (data.mimeType || '').includes('webm') ? 'webm' : 'mp4')
      : ((data.mimeType || '').split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    return {
      kind: item.kind,
      id: item.id,
      url,
      name: safeFileName(data.originalName, `${item.kind}-${item.id}.${extension}`),
      size: Number(data.size) || null,
    };
  }));

  return resolved.filter(Boolean);
}

// Crée un lien temporaire puis dépose l'e-mail dans la collection utilisée
// par l'extension Firebase "Trigger Email". Aucun compte invité n'est créé.
exports.createMediaSelection = onRequest({ region: 'europe-west1', timeoutSeconds: 60 }, async (request, response) => {
  allowCors(response);
  if (request.method === 'OPTIONS') return response.status(204).send('');
  if (request.method !== 'POST') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const email = String(request.body?.email || '').trim().toLowerCase();
    if (!isEmail(email)) return response.status(400).json({ error: 'INVALID_EMAIL' });
    if (!Array.isArray(request.body?.items)) return response.status(400).json({ error: 'INVALID_SELECTION' });

    const db = getFirestore();
    const items = await resolveApprovedMedia(db, request.body.items);
    if (!items.length) return response.status(400).json({ error: 'EMPTY_SELECTION' });

    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SELECTION_LIFETIME_MS);
    const downloadUrl = `${APP_URL}#selection=${encodeURIComponent(token)}`;
    const photoCount = items.filter(item => item.kind === 'photo').length;
    const videoCount = items.length - photoCount;

    await db.collection('downloadSelections').doc(token).set({
      eventId: EVENT_ID,
      items,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    await db.collection('mail').add({
      to: [email],
      message: {
        subject: 'Votre sélection — Mariage de Huyen & Quentin',
        text: `Votre sélection (${photoCount} photo(s), ${videoCount} vidéo(s)) est prête : ${downloadUrl}\n\nCe lien est disponible pendant 14 jours.`,
        html: `<div style="font-family:Arial,sans-serif;color:#3d2010;line-height:1.6"><h2 style="color:#5c2a1e">Huyen & Quentin</h2><p>Votre sélection de <strong>${photoCount} photo(s)</strong> et <strong>${videoCount} vidéo(s)</strong> est prête en qualité originale.</p><p><a href="${downloadUrl}" style="display:inline-block;background:#5c2a1e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px">Télécharger ma sélection</a></p><p style="font-size:12px;color:#9e7060">Ce lien est disponible pendant 14 jours.</p></div>`,
      },
    });

    return response.status(200).json({ ok: true, count: items.length });
  } catch (error) {
    console.error('createMediaSelection:', error);
    const status = error.message === 'INVALID_SELECTION' ? 400 : 500;
    return response.status(status).json({ error: error.message || 'INTERNAL_ERROR' });
  }
});

exports.getMediaSelection = onRequest({ region: 'europe-west1' }, async (request, response) => {
  allowCors(response);
  if (request.method === 'OPTIONS') return response.status(204).send('');
  if (request.method !== 'GET') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const token = String(request.query.token || '');
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return response.status(400).json({ error: 'INVALID_TOKEN' });
  const snapshot = await getFirestore().collection('downloadSelections').doc(token).get();
  if (!snapshot.exists) return response.status(404).json({ error: 'NOT_FOUND' });
  const data = snapshot.data();
  const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
  if (!expiresAt || expiresAt.getTime() < Date.now()) return response.status(410).json({ error: 'EXPIRED' });
  return response.status(200).json({ items: data.items || [], expiresAt: expiresAt.toISOString() });
});

exports.notifyNewPendingVideo = onDocumentCreated(
  { document: 'videoTestimonials/{videoId}', region: 'europe-west1' },
  async event => {
    const videoId = event.params.videoId;
    const video = event.data?.data();

    console.log('Nouvelle vidéo détectée', {
      videoId,
      status: video?.status,
      author: video?.author || null
    });

    if (!video || video.status !== 'pending') {
      console.log('Notification ignorée : vidéo absente ou statut différent de pending', { videoId });
      return;
    }

    const db = getFirestore();
    const subscriptions = await db.collection('pushSubscriptions')
      .where('enabled', '==', true)
      .get();

    const tokens = subscriptions.docs
      .map(doc => doc.data().token)
      .filter(Boolean);

    console.log('Abonnements push trouvés', {
      videoId,
      subscriptions: subscriptions.size,
      tokens: tokens.length
    });

    if (!tokens.length) {
      console.warn('Aucun jeton push actif : aucune notification envoyée', { videoId });
      await event.data.ref.update({
        notificationAttemptedAt: FieldValue.serverTimestamp(),
        notificationSuccessCount: 0,
        notificationFailureCount: 0
      });
      return;
    }

    const author = video.author ? ` de ${video.author}` : '';
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '🎥 Nouvelle vidéo à valider',
        body: `Une nouvelle vidéo${author} attend votre validation.`
      },
      data: {
        url: 'https://kitout3.github.io/mariage-app/#admin',
        videoId
      },
      webpush: {
        notification: {
          title: '🎥 Nouvelle vidéo à valider',
          body: `Une nouvelle vidéo${author} attend votre validation.`,
          icon: 'https://kitout3.github.io/mariage-app/icons/icon-192.png',
          badge: 'https://kitout3.github.io/mariage-app/icons/icon-192.png'
        },
        fcmOptions: {
          link: 'https://kitout3.github.io/mariage-app/#admin'
        }
      }
    });

    console.log('Résultat envoi notifications', {
      videoId,
      successCount: response.successCount,
      failureCount: response.failureCount
    });

    const removals = [];
    response.responses.forEach((result, index) => {
      if (!result.success) {
        console.error('Échec notification', {
          videoId,
          index,
          code: result.error?.code || null,
          message: result.error?.message || null
        });
      }

      if (
        !result.success &&
        [
          'messaging/registration-token-not-registered',
          'messaging/invalid-registration-token'
        ].includes(result.error?.code)
      ) {
        removals.push(
          db.collection('pushSubscriptions').doc(tokens[index]).delete()
        );
      }
    });

    await Promise.all(removals);

    await event.data.ref.update({
      notificationSentAt: FieldValue.serverTimestamp(),
      notificationSuccessCount: response.successCount,
      notificationFailureCount: response.failureCount
    });
  }
);
