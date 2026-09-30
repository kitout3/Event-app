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
    repeat: source.repeat !== false,
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

export function mosaicSlots(photos, count, repeat = true, offset = 0) {
  const capacity = normalizeMosaicConfig({ count }).count;
  const approved = approvedMosaicPhotos(photos);
  const slots = Array(capacity).fill(null);
  if (!approved.length) return slots;
  // Fixed permutation makes the wall fill across the whole image, while keeping
  // its arrangement deterministic across preview, resize and separate screens.
  const positions = Array.from({ length: capacity }, (_, index) => index);
  let seed = 1949;
  for (let index = capacity - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swap = seed % (index + 1);
    [positions[index], positions[swap]] = [positions[swap], positions[index]];
  }
  const start = Math.max(0, Math.floor(Number(offset) || 0)) % approved.length;
  const filled = repeat ? capacity : Math.min(capacity, approved.length);
  for (let index = 0; index < filled; index++) slots[positions[index]] = approved[(start + index) % approved.length];
  return slots;
}
