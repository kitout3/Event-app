import { useRef, useState } from "react";
import MosaicWall, { prepareMosaicAsset } from "./MosaicWall.jsx";
import { approvedMosaicPhotos, MOSAIC_COUNTS, MOSAIC_FORMATS, normalizeMosaicConfig } from "./mosaic-config.mjs";

export default function TVMosaicSettings({ mode, onModeChange, value, onChange, name, branding, photos, eventId, onUpload, onBusyChange }) {
  const config = normalizeMosaicConfig(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const uploadRevision = useRef(0);
  const set = (key, next) => onChange({ ...config, [key]: next });
  const hasPhotos = approvedMosaicPhotos(photos).length > 0;
  const upload = async file => {
    if (!file) return;
    const revision = ++uploadRevision.current;
    const key = config.type === "logo" ? "logoUrl" : "photoUrl";
    setUploading(true); onBusyChange?.(true); setError("");
    try {
      const prepared = await prepareMosaicAsset(file);
      const url = await onUpload(prepared, "mosaic");
      if (revision === uploadRevision.current) onChange(current => ({ ...current, [key]: url }));
    } catch (reason) { setError(reason?.message || "Impossible d’envoyer cette image."); }
    finally { setUploading(false); onBusyChange?.(false); }
  };
  const activeUrl = config.type === "logo" ? config.logoUrl || branding.logoUrl : config.photoUrl || branding.coverUrl;

  return <section className="tv-settings" aria-labelledby="tv-settings-title">
    <div className="tv-settings-heading"><div><span className="tv-eyebrow">AFFICHAGE TV</span><h3 id="tv-settings-title">Le grand écran de votre événement</h3><p>Choisissez l’affichage qui accompagnera vos invités.</p></div><span className="tv-live-badge"><i /> Live</span></div>
    <div className="tv-mode-options" role="group" aria-label="Mode TV">
      {[["wall", "▦", "Mur"], ["slideshow", "▣", "Diaporama"], ["mixed", "◫", "Mixte"], ["mosaic", "▧", "Mosaïque"]].map(([id, icon, label]) => <button type="button" key={id} aria-pressed={mode === id} className={`tv-mode-option ${mode === id ? "is-active" : ""}`} onClick={() => onModeChange(id)}><span aria-hidden="true">{icon}</span><span>{label}</span>{id === "mosaic" && <small>Personnalisable</small>}</button>)}
    </div>
    {mode === "mosaic" && <div className="mosaic-editor">
      <div className="mosaic-editor-intro"><h4>Mosaïque photo live</h4><p>Les photos des invités composent votre logo, votre texte ou votre image. De près, chaque souvenir. De loin, votre visuel.</p></div>
      <div className="mosaic-editor-grid">
        <div className="mosaic-fields">
          <fieldset className="mosaic-fieldset"><legend>1. Votre visuel</legend><div className="mosaic-segmented">{[["text", "Texte"], ["logo", "Logo"], ["photo", "Photo"]].map(([type, label]) => <button type="button" disabled={uploading} key={type} aria-pressed={config.type === type} onClick={() => set("type", type)}>{label}</button>)}</div></fieldset>
          {config.type === "text" ? <label className="mosaic-field"><span>Texte à former</span><textarea maxLength={100} rows={3} placeholder={name || "VOTRE\nÉVÉNEMENT"} value={config.text} onChange={event => set("text", event.target.value)} /><small>100 caractères maximum. Utilisez un saut de ligne pour composer votre visuel.</small></label> : <div className="mosaic-upload">
            {activeUrl && <div className="mosaic-upload-preview"><img src={activeUrl} alt="Visuel de la mosaïque" /></div>}
            <label className="mosaic-upload-label"><span>{uploading ? "Envoi…" : activeUrl ? "Changer le visuel" : "Importer votre visuel"}</span><input aria-label="Importer le visuel de la mosaïque" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={event => { upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
            <small>PNG, JPG ou WebP · 12 Mo maximum</small>
            {!config[config.type === "logo" ? "logoUrl" : "photoUrl"] && activeUrl && <small>Le visuel de l’événement est utilisé par défaut.</small>}
            {error && <p role="alert" className="mosaic-upload-error">{error}</p>}
          </div>}
          <fieldset className="mosaic-fieldset"><legend>2. Nombre de photos affichées</legend><div className="mosaic-count-presets">{MOSAIC_COUNTS.map(count => <button type="button" key={count} aria-pressed={config.count === count} onClick={() => set("count", count)}>{count.toLocaleString("fr-FR")}</button>)}</div><label className="mosaic-field mosaic-number-field"><span>Nombre de cases personnalisé</span><input type="number" min={25} max={2500} step={1} value={value.count} onChange={event => onChange({ ...config, count: event.target.value })} onBlur={() => set("count", normalizeMosaicConfig(value).count)} /></label><small>De 25 à 2 500 cases. Plus il y a de cases, plus l’image finale est détaillée.</small></fieldset>
          <label className="mosaic-field"><span>Format de la mosaïque</span><select value={config.format} onChange={event => set("format", event.target.value)}><option value="screen">Écran · 16:9</option><option value="square">Carré · 1:1</option><option value="portrait">Portrait · 3:4</option></select></label>
          {config.type === "photo" && <label className="mosaic-field"><span>Cadrage de la photo</span><select value={config.fit} onChange={event => set("fit", event.target.value)}><option value="cover">Remplir le cadre</option><option value="contain">Afficher l’image entière</option></select></label>}
          <fieldset className="mosaic-fieldset"><legend>3. Rendu & participation</legend><label className="mosaic-field"><span>Intensité du visuel <output>{config.strength} %</output></span><input type="range" min={0} max={90} step={5} value={config.strength} onChange={event => set("strength", Number(event.target.value))} /><small>Faible : photos plus visibles. Forte : visuel plus lisible.</small></label>
            <div className="mosaic-colors"><label><input aria-label="Couleur de fond de la mosaïque" type="color" value={config.background} onChange={event => set("background", event.target.value)} /><span>Fond</span></label>{config.type === "text" && <label><input aria-label="Couleur du texte de la mosaïque" type="color" value={config.textColor} onChange={event => set("textColor", event.target.value)} /><span>Texte</span></label>}</div>
            <p className="mosaic-progressive-note">Une photo par case, sans répétition ni rotation. Le visuel se dévoile uniquement dans les cases remplies.</p>
            <label className="mosaic-check"><input type="checkbox" checked={config.showQr} onChange={event => set("showQr", event.target.checked)} /><span>Afficher le QR code de participation</span></label>
          </fieldset>
        </div>
        <div className="mosaic-preview-column"><figure className="mosaic-preview"><div className="mosaic-preview-top"><span>Aperçu de votre écran</span><span className="mosaic-preview-dot" /></div><div className="mosaic-preview-stage" style={{ aspectRatio: MOSAIC_FORMATS[config.format] }}><MosaicWall config={config} name={name} branding={branding} photos={photos} eventId={eventId} preview /></div><figcaption><strong>{config.count.toLocaleString("fr-FR")} <span>cases</span></strong><span>{hasPhotos ? "Aperçu avec les photos approuvées" : "Aucune photo : le visuel reste masqué"}</span></figcaption></figure><p className="mosaic-preview-tip">Les photos conservent leur place. Quand le mur est plein, augmentez le nombre de cases ou consultez « Toutes les photos » sans modifier la mosaïque.</p><p className="mosaic-save-hint">Sauvegardez les modifications en bas de page pour mettre à jour l’écran TV.</p></div>
      </div>
    </div>}
  </section>;
}
