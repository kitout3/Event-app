import { useId } from "react";
import { MODULE_META } from "./event-config.mjs";
import "./module-settings.css";

const MODULE_DETAILS = {
  photoUpload: { label:"Partage de photos", description:"Permettez aux invités d’ajouter leurs photos." },
  gallery: { description:"Rassemblez les souvenirs dans une galerie." },
  reactions: { description:"Laissez les invités aimer leurs photos préférées." },
  videoTestimonials: { description:"Recueillez les messages vidéo de vos invités." },
  live: { label:"Diffusion en direct", description:"Partagez l’événement avec les invités à distance." },
  tvDisplay: { description:"Diffusez les photos sur grand écran." },
  schedule: { description:"Présentez les horaires et les temps forts." },
  practicalInfo: { description:"Indiquez le lieu, les accès et les informations utiles." },
  qrCode: { description:"Facilitez l’accès à l’événement avec un QR code." },
};

function ModuleIcon({ name }) {
  const shapes = {
    photoUpload: <><path d="M14 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-8M16 4h6m-3-3v6"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 5-5 4 4 3-3 5 5"/></>,
    gallery: <><rect x="6" y="3" width="15" height="15" rx="2"/><path d="M3 7v12a2 2 0 0 0 2 2h12m-11-7 4-4 4 4 3-3 4 4"/><circle cx="16" cy="7" r="1"/></>,
    reactions: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    videoTestimonials: <><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></>,
    live: <><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4m8.4-8.4a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></>,
    tvDisplay: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></>,
    schedule: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/></>,
    practicalInfo: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/></>,
    qrCode: <><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h3v3h3m-6 3h3m3-6v-3M12 3v3m-9 6h3m6 0v3"/></>,
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}

export default function ModuleSettings({ modules, onChange }) {
  const id = useId();
  const entries = Object.entries(MODULE_META);
  const enabledCount = entries.filter(([key]) => modules[key]).length;

  return (
    <section className="module-settings" aria-labelledby={`${id}-heading`}>
      <header className="module-settings__header">
        <div>
          <h3 id={`${id}-heading`} className="module-settings__title">Modules</h3>
          <p className="module-settings__intro">Choisissez les fonctionnalités proposées à vos invités.</p>
        </div>
        <div className="module-settings__count" role="status" aria-live="polite" aria-atomic="true">
          <span className="module-settings__count-value">{enabledCount}<span> / {entries.length}</span></span>
          <span className="module-settings__count-label">Modules activés</span>
        </div>
      </header>

      <div className="module-settings__grid">
        {entries.map(([key, meta]) => {
          const enabled = !!modules[key];
          const details = MODULE_DETAILS[key];
          return (
            <label key={key} className={`module-option${enabled ? " is-enabled" : ""}`}>
              <input
                className="module-option__input"
                type="checkbox"
                role="switch"
                checked={enabled}
                onChange={e => onChange(key, e.target.checked)}
                aria-labelledby={`${id}-${key}-label`}
                aria-describedby={`${id}-${key}-description`}
              />
              <span className="module-option__top" aria-hidden="true">
                <span className="module-option__icon"><ModuleIcon name={key} /></span>
                <span className="module-option__state">{enabled ? "Activé" : "Désactivé"}</span>
                <span className="module-option__switch" />
              </span>
              <span className="module-option__copy">
                <span id={`${id}-${key}-label`} className="module-option__title">{details.label || meta.label}</span>
                <span id={`${id}-${key}-description`} className="module-option__description">{details.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      <p className="module-settings__hint">Les changements seront appliqués après sauvegarde.</p>
    </section>
  );
}
