(() => {
  const COLLECTION = "pushSubscriptions";
  const EVENT_ID = window.__WEDDING_TENANT__?.eventId || "__invalid_wedding__";
  const PUSH_ENABLED_KEY = `video-push-enabled:${EVENT_ID}`;
  const LANG_KEY = "mariage-lang";
  const VAPID_KEY = "BF_FutOslaft75leK3ToH9EwsogNxgvPFzNSyUvTOliqs07nnXpEe7rcn6KnycfJhjUjFyhSjjRhok-bwKLb1Ug";
  const APP_BASE_PATH = window.__WEDDING_TENANT__?.assetBasePath || new URL("./", window.location.href).pathname;

  const texts = {
    fr: {
      title: "Notifications vidéo",
      desc: "Recevez une notification lorsqu’une nouvelle vidéo attend votre validation.",
      enable: "Activer les notifications",
      enabled: "Notifications activées sur cet appareil",
      denied: "Les notifications sont bloquées dans les réglages du navigateur.",
      ios: "Sur iPhone, ajoutez d’abord le site à l’écran d’accueil, puis ouvrez-le depuis son icône.",
      unsupported: "Ce navigateur ne prend pas en charge les notifications Web.",
      config: "Configuration Firebase absente ou incomplète.",
      worker: "Le service worker de notifications ne peut pas démarrer.",
      token: "Firebase Messaging ne peut pas créer le jeton. Vérifiez que l’API Firebase Cloud Messaging est activée.",
      firestore: "Le jeton a été créé, mais Firestore refuse son enregistrement dans pushSubscriptions.",
      unknown: "Erreur inconnue lors de l’activation."
    },
    en: {
      title: "Video notifications", desc: "Receive a notification when a new video is awaiting approval.", enable: "Enable notifications", enabled: "Notifications enabled on this device", denied: "Notifications are blocked in your browser settings.", ios: "On iPhone, first add the site to your Home Screen, then open it from its icon.", unsupported: "This browser does not support Web notifications.", config: "Firebase configuration is missing or incomplete.", worker: "The notification service worker could not start.", token: "Firebase Messaging could not create a token. Check that the Firebase Cloud Messaging API is enabled.", firestore: "The token was created, but Firestore rejected its registration in pushSubscriptions.", unknown: "Unknown activation error."
    },
    vi: {
      title: "Thông báo video", desc: "Nhận thông báo khi có video mới đang chờ duyệt.", enable: "Bật thông báo", enabled: "Đã bật thông báo trên thiết bị này", denied: "Thông báo đang bị chặn trong cài đặt trình duyệt.", ios: "Trên iPhone, hãy thêm trang web vào Màn hình chính rồi mở từ biểu tượng đó.", unsupported: "Trình duyệt này không hỗ trợ thông báo Web.", config: "Cấu hình Firebase bị thiếu hoặc chưa đầy đủ.", worker: "Không thể khởi động service worker thông báo.", token: "Firebase Messaging không thể tạo mã thông báo.", firestore: "Đã tạo mã thông báo nhưng Firestore từ chối lưu vào pushSubscriptions.", unknown: "Lỗi không xác định khi kích hoạt."
    }
  };

  const lang = () => texts[localStorage.getItem(LANG_KEY)] ? localStorage.getItem(LANG_KEY) : "fr";
  const t = key => texts[lang()][key];

  async function getFirebase() {
    const [{ initializeApp, getApps }, fs, msg] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js")
    ]);
    let app = getApps()[0];
    if (!app) {
      const cfg = window.__FIREBASE_CONFIG__ || {};
      if (!cfg.apiKey || !cfg.projectId || !cfg.messagingSenderId || !cfg.appId) {
        const error = new Error("Firebase configuration unavailable");
        error.stage = "config";
        throw error;
      }
      app = initializeApp(cfg);
    }
    return { cfg: app.options, db: fs.getFirestore(app), fs, messaging: msg.getMessaging(app), msg };
  }

  async function enable(button, status) {
    button.disabled = true;
    status.textContent = "…";
    try {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        const error = new Error("Notifications unsupported"); error.stage = "unsupported"; throw error;
      }
      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches) {
        status.textContent = t("ios"); button.disabled = false; return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        status.textContent = t("denied"); button.disabled = false; return;
      }

      const { cfg, db, fs, messaging, msg } = await getFirebase();
      let registration;
      try {
        const workerUrl = `${window.location.origin}${APP_BASE_PATH}firebase-messaging-sw.js?v=20260919-domain-1`;
        registration = await navigator.serviceWorker.register(workerUrl, { scope: APP_BASE_PATH });
        await registration.update();
        await navigator.serviceWorker.ready;
      } catch (cause) {
        const error = new Error(cause?.message || "Service worker failure"); error.stage = "worker"; throw error;
      }

      (registration.active || registration.waiting || registration.installing)?.postMessage({ type: "FIREBASE_CONFIG", config: cfg });

      let token;
      try {
        token = await msg.getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
        if (!token) throw new Error("No FCM token returned");
      } catch (cause) {
        const error = new Error(cause?.message || "FCM token failure"); error.stage = "token"; error.code = cause?.code; throw error;
      }

      try {
        await fs.setDoc(fs.doc(db, "events", EVENT_ID, COLLECTION, token), {
          token,
          eventId: EVENT_ID,
          enabled: true,
          platform: navigator.userAgent,
          updatedAt: fs.serverTimestamp()
        }, { merge: true });
      } catch (cause) {
        const error = new Error(cause?.message || "Firestore write failure"); error.stage = "firestore"; error.code = cause?.code; throw error;
      }

      localStorage.setItem(PUSH_ENABLED_KEY, "1");
      button.textContent = "✓ " + t("enabled");
      status.textContent = "";
    } catch (error) {
      console.error("Push notifications:", error);
      const base = t(error.stage || "unknown");
      const details = [error.code, error.message].filter(Boolean).join(" — ");
      status.textContent = details ? `${base} (${details})` : base;
      button.disabled = false;
    }
  }

  function createPanel() {
    const box = document.createElement("section");
    box.id = "push-video-settings";
    box.setAttribute("data-language-dynamic", "true");
    box.style.cssText = "background:var(--white);border-radius:18px;padding:1.5rem;box-shadow:0 2px 10px rgba(92,42,30,.12);display:grid;gap:10px;width:100%;";
    const enabled = localStorage.getItem(PUSH_ENABLED_KEY) === "1";
    box.innerHTML = `<h3 style="font:600 1.3rem 'Cormorant Garamond',serif;color:var(--burgundy);margin:0">🔔 ${t("title")}</h3><p style="color:var(--muted);font-size:.84rem;margin:0">${t("desc")}</p><button type="button" data-enable style="border:0;border-radius:999px;padding:12px 18px;background:var(--burgundy);color:#fff;font-weight:600;cursor:pointer;width:100%" ${enabled ? "disabled" : ""}>${enabled ? "✓ " + t("enabled") : t("enable")}</button><p data-status style="min-height:20px;color:var(--muted);font-size:.78rem;margin:0;overflow-wrap:anywhere"></p>`;
    const button = box.querySelector("[data-enable]");
    const status = box.querySelector("[data-status]");
    button.addEventListener("click", () => enable(button, status));
    return box;
  }

  function inject() {
    if (document.getElementById("push-video-settings") || window.location.hash.toLowerCase() !== "#admin") return;
    const saveButton = [...document.querySelectorAll("button")].find(button => /Sauvegarder|Save|Lưu/i.test((button.textContent || "").trim()));
    if (saveButton?.parentElement) { saveButton.parentElement.insertBefore(createPanel(), saveButton); return; }
    const passwordInput = document.querySelector('input[type="password"]');
    const adminColumn = passwordInput?.closest("div[style*='display: grid']")?.parentElement?.parentElement;
    if (adminColumn) adminColumn.appendChild(createPanel());
  }

  function refresh() { document.getElementById("push-video-settings")?.remove(); setTimeout(inject, 50); }
  const observer = new MutationObserver(() => setTimeout(inject, 40));
  document.addEventListener("DOMContentLoaded", () => { inject(); observer.observe(document.body, { childList: true, subtree: true }); setInterval(inject, 800); });
  window.addEventListener("hashchange", () => setTimeout(inject, 80));
  window.addEventListener("wedding-language-change", refresh);
})();