(() => {
  "use strict";
  const FALLBACK_EVENT_ID = "quentin-huyen-2026";
  const url = new URL(window.location.href);
  const raw = String(url.searchParams.get("w") || FALLBACK_EVENT_ID).toLowerCase();
  const eventId = /^[a-z0-9][a-z0-9-]{2,80}$/.test(raw) ? raw : FALLBACK_EVENT_ID;
  const basePath = `${window.location.origin}${window.location.pathname}`;
  const baseUrl = `${basePath}?w=${encodeURIComponent(eventId)}`;

  const context = {
    eventId,
    basePath,
    baseUrl,
    urlFor(view = "") {
      return `${baseUrl}${view ? `#${String(view).replace(/^#/, "")}` : ""}`;
    }
  };

  window.__WEDDING_TENANT__ = context;
  document.documentElement.dataset.weddingEventId = eventId;
})();
