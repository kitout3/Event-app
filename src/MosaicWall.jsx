import { useEffect, useMemo, useRef, useState } from "react";
import { approvedMosaicPhotos, mosaicCells, mosaicSlots, MOSAIC_FORMATS, normalizeMosaicConfig } from "./mosaic-config.mjs";
import "./mosaic-wall.css";

function imageRect(image, width, height, contain = false) {
  const factor = (contain ? Math.min : Math.max)(width / image.width, height / image.height);
  return [(width - image.width * factor) / 2, (height - image.height * factor) / 2, image.width * factor, image.height * factor];
}

function loadImage(url, signal) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const clear = () => { image.onload = null; image.onerror = null; signal?.removeEventListener("abort", abort); };
    const abort = () => { clear(); image.src = ""; reject(new DOMException("Aborted", "AbortError")); };
    if (signal?.aborted) return abort();
    image.onload = () => { clear(); resolve(image); };
    image.onerror = () => { clear(); reject(new Error("Image unavailable")); };
    signal?.addEventListener("abort", abort, { once: true });
    // No pixel readback or export is needed, so display URLs also work on hosts
    // without CORS headers. Originals are never downloaded when a preview exists.
    image.src = url;
  });
}

function drawText(context, text, width, height, color) {
  const paragraphs = String(text).trim().split(/\n/).slice(0, 5);
  let size = height * .3;
  let lines = [];
  while (size >= 8) {
    context.font = `900 ${size}px Arial, sans-serif`;
    lines = [];
    for (const paragraph of paragraphs) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && context.measureText(next).width > width * .84) { lines.push(line); line = word; }
        else line = next;
      }
      lines.push(line);
    }
    if (lines.length * size * 1.04 < height * .8 && lines.every(line => context.measureText(line).width <= width * .86)) break;
    size *= .94;
  }
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  lines.forEach((line, index) => context.fillText(line, width / 2, height / 2 + (index - (lines.length - 1) / 2) * size * 1.04));
}

function drawSample(context, cell, index) {
  const { x, y, width, height } = cell;
  // An explicitly labelled illustration for events without photos; it is never
  // used on the live wall and never enters the event's photo collection.
  const palettes = [["#bb9b79", "#e7d2b7"], ["#78928f", "#e6c5a9"], ["#d8c5ae", "#c99172"], ["#768893", "#d7baa0"], ["#b09c94", "#ebd9c6"]];
  const colors = palettes[(index * 7) % palettes.length];
  context.fillStyle = colors[0]; context.fillRect(x, y, width, height);
  for (let person = 0; person < 2 + index % 2; person++) {
    const center = x + width * (.22 + person * .3);
    context.fillStyle = colors[1];
    context.beginPath(); context.ellipse(center, y + height * .38, width * .115, height * .16, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = person % 2 ? "#e6dfd5" : "#374a4b";
    context.fillRect(center - width * .16, y + height * .57, width * .32, height * .43);
  }
}

export default function MosaicWall({ photos = [], config, name = "", branding = {}, preview = false }) {
  const frame = useRef(null), canvas = useRef(null), cache = useRef(new Map());
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [offset, setOffset] = useState(0);
  const previousIds = useRef(new Set());
  const [error, setError] = useState("");
  const settingsKey = JSON.stringify(normalizeMosaicConfig(config));
  const settings = useMemo(() => JSON.parse(settingsKey), [settingsKey]);
  const approved = approvedMosaicPhotos(photos).sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) || a.id.localeCompare(b.id));
  const photosKey = JSON.stringify(approved.map(photo => [photo.id, photo.thumbnail || photo.url]));
  const stablePhotos = useMemo(() => approved, [photosKey]);
  const aspect = MOSAIC_FORMATS[settings.format];
  const targetUrl = settings.type === "logo" ? settings.logoUrl || branding.logoUrl : settings.type === "photo" ? settings.photoUrl || branding.coverUrl : "";
  const slots = useMemo(() => mosaicSlots(stablePhotos, settings.count, settings.repeat, offset), [stablePhotos, settings.count, settings.repeat, offset]);
  const filled = slots.filter(Boolean).length;

  useEffect(() => {
    const arrivals = previousIds.current.size > 0 && stablePhotos.some(photo => !previousIds.current.has(photo.id));
    previousIds.current = new Set(stablePhotos.map(photo => photo.id));
    setOffset(arrivals && stablePhotos.length > settings.count ? stablePhotos.length - settings.count : 0);
    if (stablePhotos.length <= settings.count || preview) return;
    const interval = setInterval(() => setOffset(value => (value + settings.count) % stablePhotos.length), 12000);
    return () => clearInterval(interval);
  }, [photosKey, settings.count, preview]);

  useEffect(() => {
    const element = frame.current;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const width = Math.max(1, Math.min(bounds.width, bounds.height * aspect));
      const height = width / aspect;
      setSize(current => Math.abs(current.width - width) < .5 && Math.abs(current.height - height) < .5 ? current : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [aspect]);

  useEffect(() => {
    if (!size.width || !canvas.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    let animationFrame = 0;
    const density = Math.min(window.devicePixelRatio || 1, 2, 2560 / size.width);
    const width = Math.round(size.width * density), height = Math.round(size.height * density);
    const output = canvas.current;
    output.width = width; output.height = height;
    const context = output.getContext("2d", { alpha: false });
    const base = document.createElement("canvas"), target = document.createElement("canvas");
    base.width = target.width = width; base.height = target.height = height;
    const tiles = base.getContext("2d", { alpha: false }), visual = target.getContext("2d");
    const cells = mosaicCells(settings.count, aspect).map(cell => ({ x: cell.x * width, y: cell.y * height, width: cell.width * width, height: cell.height * height }));
    const groups = new Map();
    setError("");
    tiles.fillStyle = settings.background; tiles.fillRect(0, 0, width, height);
    visual.fillStyle = settings.background; visual.fillRect(0, 0, width, height);
    if (settings.type === "text") drawText(visual, settings.text || name, width, height, settings.textColor);

    const paint = () => {
      animationFrame = 0;
      if (signal.aborted) return;
      context.globalAlpha = 1; context.drawImage(base, 0, 0);
      // Blend the reference into every tile: close up, guests' photos remain
      // visible; from a distance, the logo, lettering or portrait takes shape.
      context.save();
      if (!settings.repeat && !(preview && !stablePhotos.length)) {
        context.beginPath();
        slots.forEach((photo, index) => { if (photo) { const cell = cells[index]; context.rect(cell.x, cell.y, cell.width, cell.height); } });
        context.clip();
      }
      context.globalAlpha = settings.strength / 100; context.drawImage(target, 0, 0);
      context.restore();
      context.globalAlpha = 1;
      context.strokeStyle = "rgba(255,255,255,.13)"; context.lineWidth = Math.max(.4, density * .5);
      for (const cell of cells) context.strokeRect(cell.x, cell.y, cell.width, cell.height);
    };
    const schedulePaint = () => { if (!animationFrame && !signal.aborted) animationFrame = requestAnimationFrame(paint); };
    const drawTile = (image, cell) => {
      tiles.save(); tiles.beginPath(); tiles.rect(cell.x, cell.y, cell.width, cell.height); tiles.clip();
      const [x, y, w, h] = imageRect(image, cell.width, cell.height);
      tiles.drawImage(image, cell.x + x, cell.y + y, w, h); tiles.restore();
    };
    slots.forEach((photo, index) => {
      if (!photo) { if (preview && !stablePhotos.length) drawSample(tiles, cells[index], index); return; }
      const url = photo.thumbnail || photo.url;
      if (!groups.has(url)) groups.set(url, []);
      groups.get(url).push(cells[index]);
    });
    // Keep only the visible page. Each decoded photo is reduced immediately to
    // the tile size; no collection of full-resolution originals stays in RAM.
    for (const key of cache.current.keys()) if (!groups.has(key)) cache.current.delete(key);
    const queue = [];
    const thumbnailSize = Math.min(240, Math.max(64, Math.ceil(Math.sqrt(width * height / settings.count) * 1.4)));
    groups.forEach((photoCells, url) => {
      const cached = cache.current.get(url);
      if (cached && cached.width >= thumbnailSize) photoCells.forEach(cell => drawTile(cached, cell));
      else queue.push([url, photoCells]);
    });
    paint();
    if (targetUrl) {
      loadImage(targetUrl, signal).then(image => {
        if (signal.aborted) return;
        const padding = settings.type === "logo" ? .1 : 0;
        const [x, y, w, h] = imageRect(image, width * (1 - padding * 2), height * (1 - padding * 2), settings.type === "logo" || settings.fit === "contain");
        visual.save(); visual.beginPath(); visual.rect(0, 0, width, height); visual.clip();
        visual.drawImage(image, x + width * padding, y + height * padding, w, h); visual.restore(); schedulePaint();
      }).catch(reason => { if (reason.name !== "AbortError") setError("Le visuel ne peut pas être chargé. Choisissez une autre image dans les paramètres."); });
    } else if (settings.type !== "text") {
      setError("Ajoutez un logo ou une photo dans les paramètres de la mosaïque.");
    }
    let failed = false;
    const worker = async () => {
      while (queue.length && !signal.aborted) {
        const [url, photoCells] = queue.shift();
        try {
          const image = await loadImage(url, signal);
          if (signal.aborted) return;
          const thumbnail = document.createElement("canvas");
          thumbnail.width = thumbnail.height = thumbnailSize;
          thumbnail.getContext("2d").drawImage(image, ...imageRect(image, thumbnailSize, thumbnailSize));
          cache.current.set(url, thumbnail);
          photoCells.forEach(cell => drawTile(thumbnail, cell)); schedulePaint();
        } catch (reason) { if (reason.name !== "AbortError") failed = true; }
      }
    };
    Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker)).then(() => {
      if (!signal.aborted && failed) setError(current => current || "Certaines photos sont indisponibles. Les autres restent affichées.");
    });
    return () => { controller.abort(); cancelAnimationFrame(animationFrame); };
  }, [slots, size, settings, aspect, targetUrl, name, preview, stablePhotos.length]);

  return <div ref={frame} className="mosaic-frame" data-mosaic-count={settings.count} data-mosaic-filled={filled} data-mosaic-unique={new Set(slots.filter(Boolean).map(photo => photo.id)).size}>
    <canvas ref={canvas} className="mosaic-canvas" role="img" aria-label="Mosaïque des photos de l’événement" style={{ width: size.width, height: size.height }} />
    {error && <p className="mosaic-notice" role="status">{error}</p>}
  </div>;
}

export async function prepareMosaicAsset(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choisissez une image PNG, JPG ou WebP.");
  if (file.size > 12 * 1024 * 1024) throw new Error("L’image doit peser moins de 12 Mo.");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
    const blob = await new Promise(resolve => canvas.toBlob(resolve, type, .92));
    if (!blob) throw new Error("Impossible de préparer cette image.");
    return new File([blob], `mosaic.${type === "image/jpeg" ? "jpg" : "png"}`, { type });
  } finally { URL.revokeObjectURL(url); }
}
