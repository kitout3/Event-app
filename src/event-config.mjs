export const EVENT_TYPES = {
  wedding: {
    id: "wedding", label: "Mariage", icon: "💍", category: "private",
    description: "Mariage, PACS, cérémonie et réception",
    defaultPreset: "wedding-elegant",
  },
  afterwork: {
    id: "afterwork", label: "Afterwork", icon: "🥂", category: "corporate",
    description: "Cocktail, networking et soirée informelle",
    defaultPreset: "afterwork-urban",
  },
  christmas: {
    id: "christmas", label: "Soirée de Noël", icon: "🎄", category: "corporate",
    description: "Fête de fin d'année et soirée collaborateurs",
    defaultPreset: "christmas-festive",
  },
  corporate: {
    id: "corporate", label: "Corporate", icon: "🏢", category: "corporate",
    description: "Séminaire, convention, lancement ou conférence",
    defaultPreset: "corporate-premium",
  },
  birthday: {
    id: "birthday", label: "Anniversaire", icon: "🎂", category: "private",
    description: "Anniversaire privé ou d'entreprise",
    defaultPreset: "birthday-pop",
  },
  gala: {
    id: "gala", label: "Gala / Cérémonie", icon: "🏆", category: "corporate",
    description: "Gala, remise de prix ou soirée prestige",
    defaultPreset: "gala-night",
  },
  team_building: {
    id: "team_building", label: "Team building", icon: "🤝", category: "corporate",
    description: "Activité d'équipe et événement collaborateurs",
    defaultPreset: "team-building-fresh",
  },
  custom: {
    id: "custom", label: "Autre événement", icon: "✨", category: "custom",
    description: "Événement festif ou format personnalisé",
    defaultPreset: "custom-neutral",
  },
};

export const THEME_PRESETS = {
  "wedding-elegant": {
    id: "wedding-elegant", label: "Elegant Romance", eventTypes: ["wedding"],
    description: "Ivoire, terracotta et typographie éditoriale",
    colors: { primary:"#5c2a1e", secondary:"#c97a6a", background:"#fdf8f4", surface:"#fffdf9", text:"#3d2010", muted:"#9e7060", accent:"#b89a6a", soft:"#f5ddd4" },
    titleFont: "'Cormorant Garamond', serif", bodyFont: "'Jost', sans-serif",
    radius: 22, hero: "radial-gradient(circle at 15% 15%, #fff8f2 0, transparent 34%), linear-gradient(150deg,#fdf8f4 0%,#f5ddd4 58%,#fffaf7 100%)",
  },
  "afterwork-urban": {
    id: "afterwork-urban", label: "Urban Social", eventTypes: ["afterwork"],
    description: "Bleu nuit, cuivre et interface contemporaine",
    colors: { primary:"#161a2d", secondary:"#d89b5b", background:"#f4f5f8", surface:"#ffffff", text:"#151827", muted:"#707486", accent:"#d89b5b", soft:"#e9eaf0" },
    titleFont: "'Manrope', sans-serif", bodyFont: "'Inter', sans-serif",
    radius: 16, hero: "radial-gradient(circle at 85% 10%, rgba(216,155,91,.26), transparent 32%), linear-gradient(145deg,#111426 0%,#252b48 58%,#161a2d 100%)",
    darkHero: true,
  },
  "christmas-festive": {
    id: "christmas-festive", label: "Festive Night", eventTypes: ["christmas"],
    description: "Vert profond, ivoire et détails dorés",
    colors: { primary:"#17392f", secondary:"#b89a55", background:"#f7f3e9", surface:"#fffdf7", text:"#17312a", muted:"#6f746d", accent:"#c3a45e", soft:"#e8e1cf" },
    titleFont: "'Cormorant Garamond', serif", bodyFont: "'Inter', sans-serif",
    radius: 18, hero: "radial-gradient(circle at 15% 20%, rgba(214,185,105,.22), transparent 26%), radial-gradient(circle at 85% 15%, rgba(255,255,255,.09), transparent 24%), linear-gradient(145deg,#0e261f 0%,#17392f 55%,#244d40 100%)",
    darkHero: true,
  },
  "corporate-premium": {
    id: "corporate-premium", label: "Premium Business", eventTypes: ["corporate"],
    description: "Sobre, structuré et adapté à l'identité de marque",
    colors: { primary:"#16243b", secondary:"#47698f", background:"#f4f6f8", surface:"#ffffff", text:"#172131", muted:"#687385", accent:"#47698f", soft:"#e3e8ee" },
    titleFont: "'Inter', sans-serif", bodyFont: "'Inter', sans-serif",
    radius: 12, hero: "linear-gradient(135deg,#f7f9fb 0%,#eaf0f6 100%)",
  },
  "birthday-pop": {
    id: "birthday-pop", label: "Color Pop", eventTypes: ["birthday"],
    description: "Vif, joyeux et très visuel",
    colors: { primary:"#6b3cc7", secondary:"#ff6f61", background:"#fff8f4", surface:"#ffffff", text:"#2f2440", muted:"#7a6e84", accent:"#f2b84b", soft:"#f1e7ff" },
    titleFont: "'Manrope', sans-serif", bodyFont: "'Inter', sans-serif",
    radius: 24, hero: "radial-gradient(circle at 15% 20%,#ffe2b7 0,transparent 26%),radial-gradient(circle at 88% 12%,#eadcff 0,transparent 30%),linear-gradient(145deg,#fff7f1,#f8efff)",
  },
  "gala-night": {
    id: "gala-night", label: "Gala Night", eventTypes: ["gala"],
    description: "Noir, champagne et contraste premium",
    colors: { primary:"#111111", secondary:"#c2a66a", background:"#141414", surface:"#1e1e1e", text:"#f6f1e8", muted:"#b7aea1", accent:"#d2ba83", soft:"#2b2925" },
    titleFont: "'Cormorant Garamond', serif", bodyFont: "'Inter', sans-serif",
    radius: 14, hero: "radial-gradient(circle at 50% 0%,rgba(210,186,131,.16),transparent 35%),linear-gradient(145deg,#090909,#1b1b1b)",
    darkHero: true, darkUi: true,
  },
  "team-building-fresh": {
    id: "team-building-fresh", label: "Fresh Team", eventTypes: ["team_building"],
    description: "Énergique, positif et accessible",
    colors: { primary:"#176b5b", secondary:"#e8a33c", background:"#f2f8f6", surface:"#ffffff", text:"#163b34", muted:"#68817b", accent:"#e8a33c", soft:"#dcefe9" },
    titleFont: "'Manrope', sans-serif", bodyFont: "'Inter', sans-serif",
    radius: 18, hero: "radial-gradient(circle at 12% 8%,#d8f1e9 0,transparent 32%),linear-gradient(145deg,#f6fbf9,#e9f5f1)",
  },
  "custom-neutral": {
    id: "custom-neutral", label: "Studio Neutral", eventTypes: ["custom"],
    description: "Neutre, élégant et facilement personnalisable",
    colors: { primary:"#2b2d31", secondary:"#7b6d62", background:"#f6f4f2", surface:"#ffffff", text:"#252525", muted:"#77716d", accent:"#9a8371", soft:"#eae5e1" },
    titleFont: "'Manrope', sans-serif", bodyFont: "'Inter', sans-serif",
    radius: 16, hero: "linear-gradient(145deg,#faf9f7,#ece7e2)",
  },
};

export const MODULE_META = {
  photoUpload: { label:"Upload photo", icon:"📸" },
  gallery: { label:"Galerie", icon:"🖼️" },
  reactions: { label:"Réactions", icon:"❤️" },
  videoTestimonials: { label:"Messages vidéo", icon:"🎥" },
  live: { label:"Live", icon:"🔴" },
  tvDisplay: { label:"Affichage TV", icon:"📺" },
  schedule: { label:"Programme", icon:"🗓️" },
  practicalInfo: { label:"Informations pratiques", icon:"ℹ️" },
  qrCode: { label:"QR Code", icon:"▦" },
};

const baseModules = {
  photoUpload:true, gallery:true, reactions:true, videoTestimonials:true,
  live:false, tvDisplay:true, schedule:false, practicalInfo:false,
  guestbook:false, qrCode:true,
};

export const DEFAULT_MODULES = {
  wedding: { ...baseModules, live:true, practicalInfo:true },
  afterwork: { ...baseModules, live:false, schedule:true, practicalInfo:true },
  christmas: { ...baseModules, live:false, schedule:true, practicalInfo:true },
  corporate: { ...baseModules, live:true, schedule:true, practicalInfo:true },
  birthday: { ...baseModules, live:false, schedule:false, practicalInfo:false },
  gala: { ...baseModules, live:true, schedule:true, practicalInfo:true },
  team_building: { ...baseModules, live:false, schedule:true, practicalInfo:true },
  custom: { ...baseModules },
};

export const DEFAULT_LABELS = {
  wedding: {
    heroSubtitle:"Partagez vos plus beaux souvenirs",
    uploadTitle:"Envoyer une photo", uploadSubtitle:"Partager un souvenir",
    galleryTitle:"Galerie & réactions", gallerySubtitle:"Voir tous les souvenirs",
    videoTitle:"Laisser un témoignage vidéo", tvTitle:"Affichage TV",
    adminTitle:"Administration", adminSubtitle:"Modérer & personnaliser",
    qrTitle:"QR Code invités", latest:"Dernière", galleryPage:"Galerie du mariage",
  },
  afterwork: {
    heroSubtitle:"Partageons les meilleurs moments de la soirée",
    uploadTitle:"Partager un moment", uploadSubtitle:"Ajouter une photo",
    galleryTitle:"Mur photo", gallerySubtitle:"Voir la galerie de la soirée",
    videoTitle:"Laisser un message vidéo", tvTitle:"Écran de la soirée",
    adminTitle:"Espace organisateur", adminSubtitle:"Piloter l'afterwork",
    qrTitle:"QR Code participants", latest:"À l'instant", galleryPage:"Galerie de l'afterwork",
  },
  christmas: {
    heroSubtitle:"Partagez les meilleurs moments de la soirée",
    uploadTitle:"Partager un souvenir", uploadSubtitle:"Ajouter une photo festive",
    galleryTitle:"Mur des souvenirs", gallerySubtitle:"Voir toutes les photos",
    videoTitle:"Laisser un message vidéo", tvTitle:"Écran de fête",
    adminTitle:"Espace organisateur", adminSubtitle:"Piloter la soirée",
    qrTitle:"QR Code participants", latest:"Nouveau", galleryPage:"Galerie de Noël",
  },
  corporate: {
    heroSubtitle:"Retrouvez et partagez les temps forts de l'événement",
    uploadTitle:"Ajouter une photo", uploadSubtitle:"Partager un temps fort",
    galleryTitle:"Galerie de l'événement", gallerySubtitle:"Voir les contenus publiés",
    videoTitle:"Messages vidéo", tvTitle:"Affichage événement",
    adminTitle:"Espace organisateur", adminSubtitle:"Gérer l'événement",
    qrTitle:"QR Code participants", latest:"Nouveau", galleryPage:"Galerie de l'événement",
  },
  birthday: {
    heroSubtitle:"Tous les souvenirs de cette journée au même endroit",
    uploadTitle:"Partager une photo", uploadSubtitle:"Ajouter un souvenir",
    galleryTitle:"Galerie & réactions", gallerySubtitle:"Revivre les meilleurs moments",
    videoTitle:"Laisser un message vidéo", tvTitle:"Diaporama",
    adminTitle:"Organisation", adminSubtitle:"Gérer l'événement",
    qrTitle:"QR Code invités", latest:"Nouveau", galleryPage:"Galerie de l'anniversaire",
  },
  gala: {
    heroSubtitle:"Revivez les temps forts de cette soirée",
    uploadTitle:"Partager une photo", uploadSubtitle:"Ajouter un moment",
    galleryTitle:"Galerie officielle", gallerySubtitle:"Voir les temps forts",
    videoTitle:"Messages vidéo", tvTitle:"Écran de gala",
    adminTitle:"Espace organisateur", adminSubtitle:"Piloter le gala",
    qrTitle:"QR Code participants", latest:"Nouveau", galleryPage:"Galerie du gala",
  },
  team_building: {
    heroSubtitle:"Une équipe, des moments à partager",
    uploadTitle:"Partager une photo", uploadSubtitle:"Ajouter un moment d'équipe",
    galleryTitle:"Galerie de l'équipe", gallerySubtitle:"Voir les souvenirs",
    videoTitle:"Messages de l'équipe", tvTitle:"Écran d'équipe",
    adminTitle:"Espace organisateur", adminSubtitle:"Piloter l'événement",
    qrTitle:"QR Code participants", latest:"Nouveau", galleryPage:"Galerie du team building",
  },
  custom: {
    heroSubtitle:"Partagez les meilleurs moments de l'événement",
    uploadTitle:"Partager une photo", uploadSubtitle:"Ajouter un souvenir",
    galleryTitle:"Galerie", gallerySubtitle:"Voir les contenus",
    videoTitle:"Messages vidéo", tvTitle:"Affichage TV",
    adminTitle:"Espace organisateur", adminSubtitle:"Gérer l'événement",
    qrTitle:"QR Code participants", latest:"Nouveau", galleryPage:"Galerie de l'événement",
  },
};

export function eventTypeOf(value) {
  return EVENT_TYPES[value] ? value : "custom";
}

export function presetForType(type) {
  const safe = eventTypeOf(type);
  return EVENT_TYPES[safe].defaultPreset;
}

export function themePresetOf(id, type = "custom") {
  return THEME_PRESETS[id] ? id : presetForType(type);
}

export function eventDefaults(type = "wedding") {
  const safe = eventTypeOf(type);
  const preset = themePresetOf(EVENT_TYPES[safe].defaultPreset, safe);
  return {
    eventType:safe,
    customEventType:"",
    themePreset:preset,
    theme:{ preset, ...THEME_PRESETS[preset].colors },
    modules:{ ...DEFAULT_MODULES[safe] },
    labels:{ ...DEFAULT_LABELS[safe] },
    branding:{ logoUrl:"", coverUrl:"", organisationName:"", showPlatformBranding:true },
    location:"",
    organiserName:"",
    scheduleText:"",
    practicalInfoText:"",
  };
}

export function normalizeEventConfig(event = {}) {
  const type = eventTypeOf(event.eventType || (event.slug === "quentin-huyen-2026" ? "wedding" : "custom"));
  const base = eventDefaults(type);
  const presetId = themePresetOf(event.themePreset || event.theme?.preset || base.themePreset, type);
  const preset = THEME_PRESETS[presetId];
  return {
    ...base,
    ...event,
    eventType:type,
    themePreset:presetId,
    theme:{ ...preset.colors, ...(event.theme || {}), preset:presetId },
    modules:{ ...base.modules, ...(event.modules || {}) },
    labels:{ ...base.labels, ...(event.labels || {}) },
    branding:{ ...base.branding, ...(event.branding || {}) },
  };
}

export function cssVarsForEvent(event = {}) {
  const normalized = normalizeEventConfig(event);
  const preset = THEME_PRESETS[normalized.themePreset];
  const colors = { ...preset.colors, ...normalized.theme };
  return {
    "--cream": colors.background,
    "--blush": colors.soft,
    "--rose": colors.secondary,
    "--burgundy": colors.primary,
    "--gold": colors.accent,
    "--text": colors.text,
    "--muted": colors.muted,
    "--white": colors.surface,
    "--shadow": `${colors.primary}20`,
    "--event-title-font": preset.titleFont,
    "--event-body-font": preset.bodyFont,
    "--event-radius": `${preset.radius}px`,
    "--event-hero": preset.hero,
    "--event-hero-text": preset.darkHero ? "#ffffff" : colors.primary,
    "--event-hero-muted": preset.darkHero ? "rgba(255,255,255,.76)" : colors.muted,
  };
}
