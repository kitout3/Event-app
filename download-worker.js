const DOWNLOADS = new Map();
const DOWNLOAD_ROUTE = "/__download__/";
const DOWNLOAD_TTL_MS = 10 * 60 * 1000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

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

self.addEventListener("message", event => {
  if (event.data?.type !== "PREPARE_MEDIA_DOWNLOAD") return;

  const id = String(event.data.id || "");
  const blob = event.data.blob;
  if (!/^[a-zA-Z0-9-]+$/.test(id) || !(blob instanceof Blob)) {
    event.ports[0]?.postMessage({ ok: false });
    return;
  }

  DOWNLOADS.set(id, {
    blob,
    name: safeFilename(event.data.name),
    expiresAt: Date.now() + DOWNLOAD_TTL_MS,
  });
  event.ports[0]?.postMessage({ ok: true });
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const routeIndex = url.pathname.indexOf(DOWNLOAD_ROUTE);
  if (url.origin !== self.location.origin || routeIndex < 0) return;

  const id = decodeURIComponent(url.pathname.slice(routeIndex + DOWNLOAD_ROUTE.length));
  const download = DOWNLOADS.get(id);
  if (!download || download.expiresAt < Date.now()) {
    DOWNLOADS.delete(id);
    event.respondWith(new Response("Téléchargement expiré", { status: 404 }));
    return;
  }

  const asciiName = asciiFilename(download.name);
  const utf8Name = encodeURIComponent(download.name);
  event.respondWith(new Response(download.blob, {
    status: 200,
    headers: {
      "Content-Type": download.blob.type || "application/octet-stream",
      "Content-Length": String(download.blob.size),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  }));
});

setInterval(() => {
  const now = Date.now();
  DOWNLOADS.forEach((download, id) => {
    if (download.expiresAt < now) DOWNLOADS.delete(id);
  });
}, 60 * 1000);
