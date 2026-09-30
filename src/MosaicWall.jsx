import { useEffect, useMemo, useRef, useState } from "react";
import { approvedMosaicPhotos, fitMosaic, mosaicCells, mosaicPoint, reconcileMosaicSlots, MOSAIC_FORMATS, normalizeMosaicConfig } from "./mosaic-config.mjs";
import { createMosaicRenderer, loadMosaicImage } from "./mosaic-renderer.mjs";
import useMosaicPanZoom, { useElementSize } from "./useMosaicPanZoom.jsx";
import MosaicPhotoViewer from "./MosaicPhotoViewer.jsx";
import "./mosaic-wall.css";

function storedPlacement(key, count) {
  if (!key) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) ? stored.slice(0, count).map(id => typeof id === "string" ? id : null) : [];
  } catch { return []; }
}

export default function MosaicWall({ photos = [], config, name = "", branding = {}, preview = false, eventId = "" }) {
  const frame = useRef(null), canvas = useRef(null), renderer = useRef(null);
  const size = useElementSize(frame);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const settingsKey = JSON.stringify(normalizeMosaicConfig(config));
  const settings = useMemo(() => JSON.parse(settingsKey), [settingsKey]);
  const approved = approvedMosaicPhotos(photos).sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) || a.id.localeCompare(b.id));
  const photosKey = JSON.stringify(approved.map(photo => [photo.id, photo.thumbnail || photo.url]));
  const stablePhotos = useMemo(() => approved, [photosKey]);
  const scope = eventId ? `event-mosaic-placement-v2:${eventId}:${settings.count}` : "";
  const [placement, setPlacement] = useState(() => ({ scope, ids: storedPlacement(scope, settings.count) }));
  const nextIds = useMemo(() => {
    const previous = placement.scope === scope ? placement.ids : storedPlacement(scope, settings.count);
    // An initial empty Firestore emission must not erase saved positions. Only
    // currently approved photos are resolved below, so removed images stay hidden.
    return stablePhotos.length ? reconcileMosaicSlots(previous, stablePhotos, settings.count) : previous;
  }, [placement, scope, settings.count, stablePhotos]);
  const layoutKey = JSON.stringify(nextIds);
  useEffect(() => {
    if (placement.scope !== scope || JSON.stringify(placement.ids) !== layoutKey) setPlacement({ scope, ids: nextIds });
    if (scope && !preview && stablePhotos.length) {
      try { localStorage.setItem(scope, layoutKey); } catch { /* Private browsing still supports a static wall for this session. */ }
    }
  }, [scope, layoutKey, preview]);
  const slots = useMemo(() => {
    const byId = new Map(stablePhotos.map(photo => [photo.id, photo]));
    return Array.from({ length: settings.count }, (_, index) => byId.get(nextIds[index]) || null);
  }, [layoutKey, stablePhotos, settings.count]);
  const aspect = MOSAIC_FORMATS[settings.format], content = fitMosaic(size, aspect);
  const cells = useMemo(() => mosaicCells(settings.count, aspect), [settings.count, aspect]);
  const targetUrl = settings.type === "logo" ? settings.logoUrl || branding.logoUrl : settings.type === "photo" ? settings.photoUrl || branding.coverUrl : "";
  const filled = slots.filter(Boolean).length;
  const { camera, zoom, reset, handlers } = useMosaicPanZoom({ ref: frame, viewport: size, content, enabled: !preview, onTap: (point, currentCamera) => {
    const local = mosaicPoint(point, currentCamera, size, content);
    const index = cells.findIndex(cell => local.x >= cell.x && local.x < cell.x + cell.width && local.y >= cell.y && local.y < cell.y + cell.height);
    if (slots[index]) setSelectedId(slots[index].id);
  } });

  useEffect(() => {
    renderer.current = createMosaicRenderer(canvas.current, setError);
    return () => renderer.current.destroy();
  }, []);
  useEffect(() => { renderer.current.update({ size, slots, settings, targetUrl, name, camera }); }, [size, slots, settings, targetUrl, name, camera]);

  return <div className={`mosaic-explorer ${preview ? "is-preview" : ""}`}>
    <div ref={frame} className="mosaic-frame" tabIndex={preview ? undefined : 0} role="group" aria-label="Explorer la mosaïque" {...handlers} data-mosaic-count={settings.count} data-mosaic-filled={filled} data-mosaic-unique={filled} data-mosaic-scale={camera.scale} data-mosaic-pan-x={camera.x} data-mosaic-pan-y={camera.y}>
      <canvas ref={canvas} className="mosaic-canvas" role="img" aria-label="Mosaïque des photos de l’événement" />
      {error && <p className="mosaic-notice" role="status">{error}</p>}
    </div>
    {!preview && <div className="mosaic-explorer-controls"><div className="mosaic-zoom-tools" role="group" aria-label="Zoom de la mosaïque">
      <button type="button" aria-label="Réduire la mosaïque" disabled={camera.scale <= 1} onClick={() => zoom(1 / 1.5)}>−</button><output>{Math.round(camera.scale * 100)} %</output><button type="button" aria-label="Agrandir la mosaïque" disabled={camera.scale >= 12} onClick={() => zoom(1.5)}>+</button><button type="button" onClick={reset}>Vue d’ensemble</button>
      <button type="button" disabled={!approved.length} onClick={() => setSelectedId(approved[0].id)}>Toutes les photos <span>({approved.length})</span></button>
    </div><p className="mosaic-gesture-hint">Molette ou pincement pour zoomer · Glissez pour explorer · Touchez une photo pour l’agrandir</p></div>}
    {selectedId && <MosaicPhotoViewer photos={approved} selectedId={selectedId} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />}
  </div>;
}

export async function prepareMosaicAsset(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choisissez une image PNG, JPG ou WebP.");
  if (file.size > 12 * 1024 * 1024) throw new Error("L’image doit peser moins de 12 Mo.");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadMosaicImage(url);
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
