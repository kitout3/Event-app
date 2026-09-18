(() => {
  const PANEL_ID = "wedding-live-panel";
  const BADGE_ID = "wedding-live-viewers";
  const COLLECTION = "livePresence";
  const EVENT_ID = window.__WEDDING_TENANT__?.eventId || "quentin-huyen-2026";
  const HEARTBEAT_MS = 25000;
  const ACTIVE_WINDOW_MS = 70000;

  let heartbeatTimer = null;
  let refreshTimer = null;
  let unsubscribe = null;
  let presenceRef = null;
  let firestore = null;

  function getLang() {
    const value = localStorage.getItem("mariage-lang") || "fr";
    return ["fr", "en", "vi"].includes(value) ? value : "fr";
  }

  function label(count) {
    const lang = getLang();
    if (lang === "en") return `${count} ${count === 1 ? "viewer" : "viewers"}`;
    if (lang === "vi") return `${count} người đang xem`;
    return `${count} ${count === 1 ? "personne présente" : "personnes présentes"}`;
  }

  function sessionId() {
    let id = sessionStorage.getItem("wedding-live-session");
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, "");
      sessionStorage.setItem("wedding-live-session", id);
    }
    return id;
  }

  async function getFirebase() {
    if (firestore) return firestore;
    const [{ initializeApp, getApps }, fs] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
    ]);
    const cfg = window.__FIREBASE_CONFIG__ || {};
    if (!cfg.apiKey || !cfg.projectId) throw new Error("Firebase configuration missing");
    const app = getApps()[0] || initializeApp(cfg);
    firestore = { db: fs.getFirestore(app), fs };
    return firestore;
  }

  function ensureBadge(panel) {
    let badge = panel.querySelector(`#${BADGE_ID}`);
    if (badge) return badge;

    badge = document.createElement("div");
    badge.id = BADGE_ID;
    badge.setAttribute("aria-live", "polite");
    badge.style.cssText = "display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;background:#fffdf9;border-top:1px solid #f5ddd4;border-bottom:1px solid #f5ddd4;color:#5c2a1e;padding:10px 14px;font-size:.86rem;font-weight:600;white-space:nowrap;flex:0 0 auto;position:relative;z-index:1";
    badge.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#2e9d58;box-shadow:0 0 0 4px rgba(46,157,88,.14)"></span><span data-viewer-count>${label(1)}</span>`;

    const liveBody = panel.querySelector("[data-live-body]");
    const chat = panel.querySelector("#wedding-live-chat");
    if (chat) {
      panel.insertBefore(badge, chat);
    } else if (liveBody?.nextSibling) {
      panel.insertBefore(badge, liveBody.nextSibling);
    } else if (liveBody) {
      liveBody.insertAdjacentElement("afterend", badge);
    } else {
      panel.appendChild(badge);
    }
    return badge;
  }

  async function heartbeat() {
    if (!presenceRef) return;
    try {
      const { fs } = await getFirebase();
      await fs.setDoc(presenceRef, {
        eventId: EVENT_ID,
        sessionId: sessionId(),
        lastSeen: fs.serverTimestamp(),
        page: "live"
      }, { merge: true });
    } catch (error) {
      console.error("Live presence heartbeat:", error);
    }
  }

  async function start(panel) {
    if (!panel || panel.dataset.presenceStarted === "true") return;
    panel.dataset.presenceStarted = "true";
    const badge = ensureBadge(panel);

    try {
      const { db, fs } = await getFirebase();
      presenceRef = fs.doc(db, "events", EVENT_ID, COLLECTION, sessionId());
      await heartbeat();
      heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);

      unsubscribe = fs.onSnapshot(fs.collection(db, "events", EVENT_ID, COLLECTION), snapshot => {
        const cutoff = Date.now() - ACTIVE_WINDOW_MS;
        let count = 0;
        snapshot.forEach(doc => {
          const item = doc.data();
          const seen = item.lastSeen?.toMillis?.() || 0;
          if (item.eventId === EVENT_ID && item.page === "live" && seen >= cutoff) count += 1;
        });
        const output = badge.querySelector("[data-viewer-count]");
        if (output) output.textContent = label(Math.max(count, 1));
      }, error => console.error("Live presence count:", error));

      refreshTimer = setInterval(() => {
        const output = badge.querySelector("[data-viewer-count]");
        if (output && !document.getElementById(PANEL_ID)) output.textContent = label(0);
      }, 30000);
    } catch (error) {
      console.error("Live presence init:", error);
      badge.style.display = "none";
    }
  }

  async function stop() {
    clearInterval(heartbeatTimer);
    clearInterval(refreshTimer);
    heartbeatTimer = null;
    refreshTimer = null;
    unsubscribe?.();
    unsubscribe = null;

    if (presenceRef) {
      try {
        const { fs } = await getFirebase();
        await fs.deleteDoc(presenceRef);
      } catch {}
      presenceRef = null;
    }
  }

  function scan() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) start(panel);
    else if (presenceRef || heartbeatTimer || unsubscribe) stop();
  }

  const observer = new MutationObserver(() => setTimeout(scan, 40));
  document.addEventListener("DOMContentLoaded", () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  });
  window.addEventListener("pagehide", stop);
  window.addEventListener("hashchange", () => setTimeout(scan, 60));
})();