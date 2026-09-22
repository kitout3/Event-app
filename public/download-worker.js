const DOWNLOAD_ROUTE = "/__download__/";
const DOWNLOAD_TTL_MS = 10 * 60 * 1000;
const DOWNLOAD_CACHE = "event-app-downloads-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(Promise.all([
  self.clients.claim(),
  cleanupDownloads(),
])));

function safeFilename(value) {
  return String(value || "souvenirs")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .slice(0, 160) || "souvenirs";
}

function asciiFilename(value) {
  return safeFilename(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "-")
    .replace(/["\\]/g, "-");
}

function downloadUrl(id) {
  return new URL(encodeURIComponent(id), self.registration.scope).href;
}

function downloadHeaders(blob, name, expiresAt) {
  const asciiName = asciiFilename(name);
  const utf8Name = encodeURIComponent(name);
  return {
    "Content-Type": blob.type || "application/octet-stream",
    "Content-Length": String(blob.size),
    "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Download-Expires-At": String(expiresAt),
  };
}

async function cleanupDownloads() {
  const cache = await caches.open(DOWNLOAD_CACHE);
  const requests = await cache.keys();
  await Promise.all(requests.map(async request => {
    const response = await cache.match(request);
    const expiresAt = Number(response?.headers.get("X-Download-Expires-At"));
    if (!expiresAt || expiresAt < Date.now()) await cache.delete(request);
  }));
}

self.addEventListener("message", event => {
  if (event.data?.type !== "PREPARE_MEDIA_DOWNLOAD") return;

  const id = String(event.data.id || "");
  const blob = event.data.blob;
  if (!/^[a-zA-Z0-9-]+$/.test(id) || !(blob instanceof Blob)) {
    event.ports[0]?.postMessage({ ok: false });
    return;
  }

  const preparation = (async () => {
    const name = safeFilename(event.data.name);
    const expiresAt = Date.now() + DOWNLOAD_TTL_MS;
    const cache = await caches.open(DOWNLOAD_CACHE);
    await cache.put(downloadUrl(id), new Response(blob, {
      status: 200,
      headers: downloadHeaders(blob, name, expiresAt),
    }));
    await cleanupDownloads();
    event.ports[0]?.postMessage({ ok: true });
  })().catch(error => {
    event.ports[0]?.postMessage({ ok: false, error: error?.message || "Stockage du téléchargement impossible" });
  });
  event.waitUntil(preparation);
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const routeIndex = url.pathname.indexOf(DOWNLOAD_ROUTE);
  if (url.origin !== self.location.origin || routeIndex < 0) return;

  event.respondWith((async () => {
    const cache = await caches.open(DOWNLOAD_CACHE);
    const response = await cache.match(event.request, { ignoreSearch: true });
    const expiresAt = Number(response?.headers.get("X-Download-Expires-At"));
    if (!response || !expiresAt || expiresAt < Date.now()) {
      if (response) await cache.delete(event.request, { ignoreSearch: true });
      return new Response("Téléchargement expiré", { status: 404 });
    }
    return response;
  })());
});
