(() => {
  "use strict";

  const LEGACY_DEFAULT_EVENT_ID = "quentin-huyen-2026";
  const INVALID_EVENT_ID = "__invalid_wedding__";
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("w");
  const raw = String(requested || "").trim().toLowerCase();
  const validSlug = /^[a-z0-9][a-z0-9-]{0,79}$/.test(raw);

  // IMPORTANT: only URLs with no ?w= at all may use the historical default.
  // An explicit but invalid wedding id must NEVER fall back to another tenant.
  const eventId = requested === null
    ? LEGACY_DEFAULT_EVENT_ID
    : (validSlug ? raw : INVALID_EVENT_ID);

  const basePath = `${window.location.origin}${window.location.pathname}`;
  const baseUrl = `${basePath}?w=${encodeURIComponent(eventId)}`;

  const context = {
    eventId,
    requestedEventId: requested,
    isValid: eventId !== INVALID_EVENT_ID,
    basePath,
    baseUrl,
    urlFor(view = "") {
      return `${baseUrl}${view ? `#${String(view).replace(/^#/, "")}` : ""}`;
    }
  };

  window.__WEDDING_TENANT__ = context;
  document.documentElement.dataset.weddingEventId = eventId;
})();