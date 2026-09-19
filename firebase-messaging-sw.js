importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

self.addEventListener('message', event => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    try {
      if (!firebase.apps.length) firebase.initializeApp(event.data.config);
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage(payload => {
        const title = payload.notification?.title || 'Nouvelle vidéo à valider';
        const options = {
          body: payload.notification?.body || 'Une nouvelle vidéo attend votre validation.',
          icon: './favicon.svg',
          badge: './favicon.svg',
          data: { url: payload.data?.url || './#admin' },
          tag: 'video-pending'
        };
        self.registration.showNotification(title, options);
      });
    } catch (e) { console.error(e); }
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (() => { const incoming = new URL(event.notification.data?.url || './admin.html', self.registration.scope); const url = new URL(self.registration.scope); if (incoming.searchParams.has('w')) { url.searchParams.set('w', incoming.searchParams.get('w')); url.hash = 'admin'; } else { url.pathname += 'admin.html'; } return url.href; })();
  event.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
    const existing = list.find(c => new URL(c.url).origin === self.location.origin);
    if (existing) { existing.focus(); existing.navigate(target); return; }
    return clients.openWindow(target);
  }));
});