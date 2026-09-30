import { useEffect, useRef, useState } from "react";
import { fitMosaic } from "./mosaic-config.mjs";
import useMosaicPanZoom, { useElementSize } from "./useMosaicPanZoom.jsx";

function PhotoStage({ photo }) {
  const frame = useRef(null), size = useElementSize(frame);
  const [aspect, setAspect] = useState(1), [loaded, setLoaded] = useState(false), [error, setError] = useState("");
  const [source, setSource] = useState(photo.originalUrl || photo.url || photo.thumbnail);
  const content = fitMosaic(size, aspect);
  const { camera, zoom, reset, handlers } = useMosaicPanZoom({ ref: frame, viewport: size, content, maxScale: 12 });
  return <>
    <div ref={frame} className="mosaic-photo-stage" tabIndex={0} aria-label="Explorer la photo agrandie" {...handlers} data-photo-scale={camera.scale}>
      <img src={source} alt="Photo de l’événement en grand format" draggable={false} onLoad={event => { setAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight); setLoaded(true); }} onError={() => {
        const fallback = photo.url || photo.thumbnail;
        if (fallback && source !== fallback) { setSource(fallback); setError("Original indisponible : affichage de l’aperçu."); }
        else setError("Cette photo ne peut pas être chargée.");
      }} style={{ width: content.width, height: content.height, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`, opacity: loaded ? 1 : 0 }} />
      {!loaded && !error && <p className="mosaic-photo-loading">Chargement de la photo…</p>}
      {error && <p className="mosaic-notice" role="status">{error}</p>}
    </div>
    <div className="mosaic-photo-tools" role="group" aria-label="Zoom de la photo">
      <button type="button" aria-label="Réduire la photo" disabled={camera.scale <= 1} onClick={() => zoom(1 / 1.5)}>−</button>
      <output>{Math.round(camera.scale * 100)} %</output>
      <button type="button" aria-label="Agrandir la photo" disabled={camera.scale >= 12} onClick={() => zoom(1.5)}>+</button>
      <button type="button" onClick={reset}>Ajuster la photo</button>
    </div>
  </>;
}

export default function MosaicPhotoViewer({ photos, selectedId, onSelect, onClose }) {
  const dialog = useRef(null);
  const index = photos.findIndex(photo => photo.id === selectedId), photo = photos[index];
  const change = direction => { if (photos.length) onSelect(photos[(index + direction + photos.length) % photos.length].id); };
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => { if (element.open) element.close(); };
  }, []);
  useEffect(() => { if (!photo) onClose(); }, [!!photo]);
  return <dialog ref={dialog} className="mosaic-photo-dialog" aria-label="Photo agrandie" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    if (event.key === "ArrowLeft") { event.preventDefault(); change(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); change(1); }
  }}>
    <header className="mosaic-photo-header"><div><strong>Photo agrandie</strong><span>{index + 1} / {photos.length}</span></div><button type="button" onClick={onClose} autoFocus aria-label="Fermer la photo agrandie">✕ <span>Fermer</span></button></header>
    {photo && <PhotoStage key={photo.id} photo={photo} />}
    <footer className="mosaic-photo-footer"><button type="button" onClick={() => change(-1)} disabled={photos.length < 2}>← <span>Photo précédente</span></button><div>{photo?.author && <strong translate="no">{photo.author}</strong>}{photo?.message && <p translate="no">{photo.message}</p>}</div><button type="button" onClick={() => change(1)} disabled={photos.length < 2}><span>Photo suivante</span> →</button></footer>
  </dialog>;
}
