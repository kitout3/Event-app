import { fitMosaic, mosaicCells, MOSAIC_FORMATS } from "./mosaic-config.mjs";

export function imageRect(image, width, height, contain = false) {
  const factor = (contain ? Math.min : Math.max)(width / image.width, height / image.height);
  return [(width - image.width * factor) / 2, (height - image.height * factor) / 2, image.width * factor, image.height * factor];
}

export function loadMosaicImage(url, signal) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const clear = () => { image.onload = null; image.onerror = null; signal?.removeEventListener("abort", abort); };
    const abort = () => { clear(); image.src = ""; reject(new DOMException("Aborted", "AbortError")); };
    if (signal?.aborted) return abort();
    image.onload = () => { clear(); resolve(image); };
    image.onerror = () => { clear(); reject(new Error("Image unavailable")); };
    signal?.addEventListener("abort", abort, { once: true });
    image.src = url;
  });
}

function drawText(context, text, width, height, color) {
  const paragraphs = String(text).trim().split(/\n/).slice(0, 5);
  let size = height * .3, lines = [];
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
  context.fillStyle = color; context.textAlign = "center"; context.textBaseline = "middle";
  lines.forEach((line, index) => context.fillText(line, width / 2, height / 2 + (index - (lines.length - 1) / 2) * size * 1.04));
}

// Persistent renderer: changing a counter or receiving a like never clears the
// canvas or reloads the wall. Only real scene changes schedule an atomic frame.
export function createMosaicRenderer(canvas, onError) {
  const context = canvas.getContext("2d");
  const controller = new AbortController(), cache = new Map(), pending = new Set(), failed = new Set();
  let scene, animationFrame = 0, wanted = new Map(), tick = 0;
  let targetKey = "", target = null, targetSource = null, targetError = "", photoError = "";
  const report = () => onError(targetError || photoError);
  const schedule = () => { if (!animationFrame && !controller.signal.aborted) animationFrame = requestAnimationFrame(paint); };

  function trimCache() {
    let bytes = Array.from(cache.values()).reduce((sum, item) => sum + item.image.width ** 2 * 4, 0);
    if (bytes < 80 * 1024 * 1024) return;
    const candidates = [...cache].filter(([url]) => !wanted.has(url)).sort((a, b) => a[1].used - b[1].used);
    for (const [url, item] of candidates) {
      cache.delete(url); bytes -= item.image.width ** 2 * 4;
      if (bytes < 64 * 1024 * 1024) break;
    }
  }

  function pump() {
    for (const [url, requested] of wanted) {
      if (pending.size >= 6) break;
      if (pending.has(url) || failed.has(url) || (cache.get(url)?.image.width || 0) >= requested) continue;
      pending.add(url);
      loadMosaicImage(url, controller.signal).then(image => {
        if (controller.signal.aborted) return;
        const size = wanted.get(url) || requested;
        const thumbnail = document.createElement("canvas");
        thumbnail.width = thumbnail.height = size;
        thumbnail.getContext("2d").drawImage(image, ...imageRect(image, size, size));
        cache.set(url, { image: thumbnail, used: ++tick }); trimCache();
      }).catch(error => {
        if (error.name === "AbortError") return;
        failed.add(url); photoError = "Certaines photos sont indisponibles. Les autres restent affichées."; report();
      }).finally(() => { pending.delete(url); schedule(); });
    }
  }

  function prepareTarget(content, density) {
    const { settings, targetUrl, name } = scene;
    const width = Math.max(1, Math.round(content.width * density)), height = Math.max(1, Math.round(content.height * density));
    const key = JSON.stringify([width, height, settings.type, settings.text || name, settings.textColor, settings.background, settings.fit, targetUrl]);
    if (targetKey === key) return;
    targetKey = key; targetError = "";
    const layer = document.createElement("canvas"); layer.width = width; layer.height = height;
    const visual = layer.getContext("2d");
    visual.fillStyle = settings.background; visual.fillRect(0, 0, width, height);
    target = null;
    if (settings.type === "text") {
      drawText(visual, settings.text || name, width, height, settings.textColor);
      target = layer; report(); return;
    }
    if (!targetUrl) { targetError = "Ajoutez un logo ou une photo dans les paramètres de la mosaïque."; report(); return; }
    const draw = image => {
      if (targetKey !== key || controller.signal.aborted) return;
      const padding = settings.type === "logo" ? .1 : 0;
      const [x, y, w, h] = imageRect(image, width * (1 - padding * 2), height * (1 - padding * 2), settings.type === "logo" || settings.fit === "contain");
      visual.drawImage(image, x + width * padding, y + height * padding, w, h);
      target = layer; schedule();
    };
    if (targetSource?.url === targetUrl) draw(targetSource.image);
    else loadMosaicImage(targetUrl, controller.signal).then(image => {
      if (targetKey !== key || controller.signal.aborted) return;
      targetSource = { url: targetUrl, image }; draw(image);
    }).catch(error => {
      if (targetKey !== key || error.name === "AbortError") return;
      targetError = "Le visuel ne peut pas être chargé. Choisissez une autre image dans les paramètres."; report();
    });
    report();
  }

  function paint() {
    animationFrame = 0;
    if (!scene || controller.signal.aborted || !scene.size.width || !scene.size.height) return;
    const { size, settings, camera, slots } = scene;
    const density = Math.min(window.devicePixelRatio || 1, 2, 2560 / size.width);
    const width = Math.round(size.width * density), height = Math.round(size.height * density);
    const content = fitMosaic(size, MOSAIC_FORMATS[settings.format]);
    prepareTarget(content, density);
    // Resizing and painting happen in the same frame; the browser never shows
    // an intermediate blank canvas while images are arriving or being enlarged.
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.setTransform(density, 0, 0, density, 0, 0);
    const boardWidth = content.width * camera.scale, boardHeight = content.height * camera.scale;
    const left = (size.width - boardWidth) / 2 + camera.x, top = (size.height - boardHeight) / 2 + camera.y;
    context.fillStyle = settings.background; context.fillRect(left, top, boardWidth, boardHeight);
    const bright = parseInt(settings.background.slice(1, 3), 16) + parseInt(settings.background.slice(3, 5), 16) + parseInt(settings.background.slice(5, 7), 16) > 384;
    context.strokeStyle = bright ? "rgba(20,40,35,.09)" : "rgba(255,255,255,.13)";
    context.lineWidth = .6;
    wanted = new Map();
    const cells = mosaicCells(settings.count, MOSAIC_FORMATS[settings.format]);
    for (let index = 0; index < cells.length; index++) {
      const cell = cells[index], x = left + cell.x * boardWidth, y = top + cell.y * boardHeight;
      const w = cell.width * boardWidth, h = cell.height * boardHeight;
      if (x + w < 0 || y + h < 0 || x > size.width || y > size.height) continue;
      const photo = slots[index], url = photo && (photo.thumbnail || photo.url);
      const cached = cache.get(url);
      if (url) wanted.set(url, Math.min(1024, Math.max(72, Math.ceil(Math.max(w, h) * density))));
      if (cached) {
        cached.used = ++tick;
        context.save(); context.beginPath(); context.rect(x, y, w, h); context.clip();
        context.drawImage(cached.image, x, y, w, h);
        // The target is painted ONLY inside successfully loaded photo tiles.
        // No background logo, empty-cell fragment or illustrative photo leaks it.
        if (target) {
          context.globalAlpha = settings.strength / 100;
          context.drawImage(target, cell.x * target.width, cell.y * target.height, cell.width * target.width, cell.height * target.height, x, y, w, h);
        }
        context.restore();
      }
      context.strokeRect(x, y, w, h);
    }
    pump();
  }

  return {
    update(next) { scene = next; schedule(); },
    destroy() { controller.abort(); cancelAnimationFrame(animationFrame); cache.clear(); target = null; targetSource = null; },
  };
}
