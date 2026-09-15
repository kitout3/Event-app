const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

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
