(() => {
  "use strict";

  const INVALID_EVENT_ID = "__invalid_wedding__";
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("w");
  const raw = String(requested || "").trim().toLowerCase();
  const validSlug = /^[a-z0-9][a-z0-9-]{0,79}$/.test(raw);
  const isLegacyEntry = false;
  const hasWedding = requested !== null;
  const assetBaseUrl = new URL('./', document.currentScript?.src || url.href);

  // The root URL is always the Event-App account entry point.
  // An event opens only when an explicit valid ?w=<slug> is present.
  const eventId = requested === null
    ? INVALID_EVENT_ID
    : (validSlug ? raw : INVALID_EVENT_ID);

  const basePath = `${window.location.origin}${window.location.pathname}`;
  const baseUrl = `${basePath}?w=${encodeURIComponent(eventId)}`;

  const context = {
    eventId,
    requestedEventId: requested,
    isValid: eventId !== INVALID_EVENT_ID,
    hasWedding,
    isLegacyEntry,
    assetBaseUrl: assetBaseUrl.href,
    assetBasePath: assetBaseUrl.pathname,
    basePath,
    baseUrl,
    urlFor(view = "") {
      return `${baseUrl}${view ? `#${String(view).replace(/^#/, "")}` : ""}`;
    }
  };

  window.__WEDDING_TENANT__ = context;
  document.documentElement.dataset.weddingEventId = eventId;
})();
