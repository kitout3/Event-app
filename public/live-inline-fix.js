(() => {
  const PANEL_ID = "wedding-live-panel";
  const EVENT_DOC = window.__WEDDING_TENANT__?.eventId || "quentin-huyen-2026";
  let pollTimer = null;
  let currentPlayerUrl = "";

  function lang() {
    const value = localStorage.getItem("mariage-lang") || "fr";
    return ["fr", "en", "vi"].includes(value) ? value : "fr";
  }

  const TXT = {
    fr: { back: "Retour à l’accueil", title: "Événement en direct", loading: "Chargement du direct…", empty: "Le direct n’est pas encore configuré.", hint: "Ajoutez le lien du direct dans Administration → Paramètres.", error: "Impossible de charger le direct pour le moment.", open: "Ouvrir le direct" },
    en: { back: "Back to home", title: "Live event", loading: "Loading live stream…", empty: "The live stream is not configured yet.", hint: "Add the live link in Administration → Settings.", error: "The live stream cannot be loaded right now.", open: "Open live stream" },
    vi: { back: "Về trang chủ", title: "Sự kiện trực tiếp", loading: "Đang tải buổi phát trực tiếp…", empty: "Buổi phát trực tiếp chưa được cấu hình.", hint: "Thêm liên kết trực tiếp trong Quản trị → Cài đặt.", error: "Hiện không thể tải buổi phát trực tiếp.", open: "Mở buổi trực tiếp" }
  };

  function text() { return window.EventI18n?.dictionary(TXT.fr) || TXT[lang()]; }

  function youtubeId(url) {
    if (!url) return "";
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) return u.pathname.split("/").filter(Boolean)[0] || "";
      if (u.pathname.startsWith("/live/")) return u.pathname.split("/live/")[1]?.split(/[/?#]/)[0] || "";
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1]?.split(/[/?#]/)[0] || "";
      return u.searchParams.get("v") || "";
    } catch {
      const match = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/))([\w-]{6,})/i);
      return match?.[1] || "";
    }
  }

  function toPlayerUrl(config) {
    if (config.playerUrl) return config.playerUrl;
    const direct = config.liveUrl || config.externalUrl || "";
    const id = youtubeId(direct);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1` : direct;
  }

  function decodeFirestore(fields) {
    const out = {};
    Object.entries(fields || {}).forEach(([key, value]) => {
      out[key] = value.stringValue ?? value.booleanValue ?? value.integerValue ?? value.doubleValue ?? null;
    });
    return out;
  }

  async function fetchLiveConfig() {
    const fb = window.__FIREBASE_CONFIG__ || {};
    if (!fb.projectId || !fb.apiKey) return {};
    const url = `https://firestore.googleapis.com/v1/projects/${fb.projectId}/databases/(default)/documents/events/${EVENT_DOC}?key=${encodeURIComponent(fb.apiKey)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) return {};
    if (!response.ok) throw new Error(`Firestore ${response.status}`);
    const json = await response.json();
    return decodeFirestore(json.fields);
  }

  function closePanel() {
    clearInterval(pollTimer);
    pollTimer = null;
    currentPlayerUrl = "";
    document.getElementById(PANEL_ID)?.remove();
    if (location.hash === "#live") history.replaceState(null, "", location.pathname + location.search);
  }

  function renderState(panel, config, error = false) {
    const t = text();
    const body = panel.querySelector("[data-live-body]");
    const external = config.liveUrl || config.externalUrl || "";
    const playerUrl = toPlayerUrl(config);

    if (error) {
      body.innerHTML = `<div style="text-align:center;color:var(--burgundy)"><div style="font-size:52px">⚠️</div><h2>${t.error}</h2></div>`;
      return;
    }
    if (!playerUrl) {
      currentPlayerUrl = "";
      body.innerHTML = `<div style="text-align:center;color:var(--burgundy);max-width:560px;padding:30px"><div style="font-size:58px">🎥</div><h2 style="font:300 2rem 'Cormorant Garamond',serif;margin:8px 0">${t.empty}</h2><p style="color:var(--muted)">${t.hint}</p></div>`;
      return;
    }
    if (currentPlayerUrl === playerUrl && body.querySelector("iframe")) return;
    currentPlayerUrl = playerUrl;
    body.innerHTML = `<iframe src="${playerUrl}" title="${t.title}" allow="autoplay; camera; microphone; encrypted-media; picture-in-picture; fullscreen" allowfullscreen style="width:100%;height:100%;border:0;background:#000"></iframe>${external ? `<a href="${external}" target="_blank" rel="noopener" style="position:absolute;right:18px;bottom:18px;background:rgba(0,0,0,.65);color:white;padding:9px 14px;border-radius:999px;text-decoration:none;font-size:.82rem">${t.open}</a>` : ""}`;
  }

  async function refreshLive(panel) {
    try {
      const config = await fetchLiveConfig();
      if (document.body.contains(panel)) renderState(panel, config);
    } catch (error) {
      console.error("Live config:", error);
      if (document.body.contains(panel)) renderState(panel, {}, true);
    }
  }

  function openPanel() {
    if (window.__WEDDING_EVENT__?.modules?.live === false) return;
    closePanel();
    history.replaceState(null, "", `${location.pathname}${location.search}#live`);
    const t = text();
    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <header style="height:68px;display:flex;align-items:center;padding:10px 16px;background:var(--white);border-bottom:1px solid var(--blush);position:relative;z-index:2">
        <button data-live-back type="button" style="border:0;background:var(--burgundy);color:white;border-radius:999px;padding:10px 17px;cursor:pointer">← ${t.back}</button>
        <strong style="position:absolute;left:50%;transform:translateX(-50%);font:500 22px var(--event-title-font);color:var(--burgundy);white-space:nowrap">${(window.__WEDDING_EVENT__?.name || "Événement").replace(/</g,"&lt;")} · Live</strong>
      </header>
      <div data-live-main style="position:relative;flex:1;display:flex;min-height:0;min-width:0;overflow:hidden">
        <div data-live-body style="position:relative;flex:1;display:flex;align-items:center;justify-content:center;background:var(--cream);min-height:0;min-width:0">
          <div style="color:var(--muted)">${t.loading}</div>
        </div>
      </div>`;
    Object.assign(panel.style, { position: "fixed", inset: "0", zIndex: "2147483646", display: "flex", flexDirection: "column", background: "#fdf8f4" });
    panel.querySelector("[data-live-back]").onclick = closePanel;
    document.body.appendChild(panel);
    refreshLive(panel);
    pollTimer = setInterval(() => refreshLive(panel), 10000);
  }

  function isLiveControl(target) {
    const control = target.closest("button, a, [role='button']");
    if (!control) return false;
    if (control.id === "wedding-live-card" || control.dataset?.action === "live") return true;
    const card = control.closest("button, a, [role='button'], section, article, div");
    const label = `${control.textContent || ""} ${card?.textContent || ""}`.replace(/\s+/g, " ").trim();
    return /Live de l’événement|Regarder le live|Suivre la diffusion en direct|Suivre la cérémonie en direct|Watch live|Live event|Xem trực tiếp/i.test(label);
  }

  document.addEventListener("click", event => {
    if (!isLiveControl(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openPanel();
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    if (location.hash === "#live") openPanel();
  });

  window.addEventListener("hashchange", () => {
    if (location.hash === "#live" && !document.getElementById(PANEL_ID)) openPanel();
  });
})();
