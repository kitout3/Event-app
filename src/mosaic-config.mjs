export const MOSAIC_COUNTS = [100, 400, 900, 1600, 2500];
export const MOSAIC_FORMATS = { screen: 16 / 9, square: 1, portrait: 3 / 4 };
export const TV_MODES = ["wall", "slideshow", "mixed", "mosaic"];

const bounded = (value, fallback, min, max) => {
  const number = Number(value);
  return value === "" || value == null || !Number.isFinite(number)
    ? fallback : Math.max(min, Math.min(max, Math.round(number)));
};
const imageUrl = value => typeof value === "string" && /^https?:\/\//i.test(value) ? value.slice(0, 2400) : "";
const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;

export function normalizeMosaicConfig(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    type: ["text", "logo", "photo"].includes(source.type) ? source.type : "text",
    text: typeof source.text === "string" ? source.text.slice(0, 100) : "",
    logoUrl: imageUrl(source.logoUrl),
    photoUrl: imageUrl(source.photoUrl),
    count: bounded(source.count, 400, 25, 2500),
    strength: bounded(source.strength, 65, 0, 90),
    format: Object.hasOwn(MOSAIC_FORMATS, source.format) ? source.format : "screen",
    fit: source.fit === "contain" ? "contain" : "cover",
    background: color(source.background, "#f4f0e8"),
    textColor: color(source.textColor, "#153b43"),
    // Migrate existing repeating walls to the progressive, static experience.
    repeat: false,
    showQr: source.showQr !== false,
  };
}

// Exact capacity, including prime numbers: distribute the extra cells across
// rows instead of leaving a partial strip at the edge of the finished image.
export function mosaicCells(count, aspect = 16 / 9) {
  const capacity = normalizeMosaicConfig({ count }).count;
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const rows = Math.max(1, Math.round(Math.sqrt(capacity / ratio)));
  const minimum = Math.floor(capacity / rows);
  const extra = capacity % rows;
  const cells = [];
  for (let row = 0; row < rows; row++) {
    const columns = minimum + (row < extra ? 1 : 0);
    for (let column = 0; column < columns; column++) {
      cells.push({ x: column / columns, y: row / rows, width: 1 / columns, height: 1 / rows });
    }
  }
  return cells;
}

export function approvedMosaicPhotos(photos) {
  const seen = new Set();
  return photos.filter(photo => {
    if (photo.status !== "approved" || !photo.id || !(photo.thumbnail || photo.url) || seen.has(photo.id)) return false;
    seen.add(photo.id);
    return true;
  });
}

export function reconcileMosaicSlots(previous, photos, count) {
  const capacity = normalizeMosaicConfig({ count }).count;
  const approved = approvedMosaicPhotos(photos).sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) || a.id.localeCompare(b.id));
  const byId = new Map(approved.map(photo => [photo.id, photo]));
  const assigned = new Set();
  const slots = Array(capacity).fill(null);
  // Keep every surviving photo in its existing cell, even when another photo
  // is approved late, removed, liked or has its timestamp resolved by Firebase.
  for (let index = 0; index < capacity; index++) {
    const id = previous?.[index];
    if (byId.has(id) && !assigned.has(id)) { slots[index] = id; assigned.add(id); }
  }
  const positions = Array.from({ length: capacity }, (_, index) => index);
  let seed = 1949;
  for (let index = capacity - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swap = seed % (index + 1);
    [positions[index], positions[swap]] = [positions[swap], positions[index]];
  }
  const empty = positions.filter(index => slots[index] === null);
  const arrivals = approved.filter(photo => !assigned.has(photo.id));
  for (let index = 0; index < Math.min(empty.length, arrivals.length); index++) slots[empty[index]] = arrivals[index].id;
  return slots;
}

export function mosaicSlots(photos, count, previous = []) {
  const byId = new Map(approvedMosaicPhotos(photos).map(photo => [photo.id, photo]));
  return reconcileMosaicSlots(previous, photos, count).map(id => byId.get(id) || null);
}

export function fitMosaic(viewport, aspect) {
  const width = Math.min(viewport.width, viewport.height * aspect);
  return { width, height: width / aspect };
}

export function clampMosaicCamera(camera, viewport, content, maxScale = 12) {
  const scale = Math.max(1, Math.min(maxScale, camera.scale));
  const limitX = Math.max(0, (content.width * scale - viewport.width) / 2);
  const limitY = Math.max(0, (content.height * scale - viewport.height) / 2);
  return { scale, x: Math.max(-limitX, Math.min(limitX, camera.x)), y: Math.max(-limitY, Math.min(limitY, camera.y)) };
}

export function zoomMosaicAt(camera, scale, point, viewport, content, maxScale = 12) {
  const nextScale = Math.max(1, Math.min(maxScale, scale));
  const ratio = nextScale / camera.scale;
  const x = point.x - viewport.width / 2, y = point.y - viewport.height / 2;
  return clampMosaicCamera({ scale: nextScale, x: x + (camera.x - x) * ratio, y: y + (camera.y - y) * ratio }, viewport, content, maxScale);
}

export function mosaicPoint(point, camera, viewport, content) {
  return { x: (point.x - viewport.width / 2 - camera.x) / (content.width * camera.scale) + .5, y: (point.y - viewport.height / 2 - camera.y) / (content.height * camera.scale) + .5 };
}
