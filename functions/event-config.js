const EVENT_TYPES = new Set(["wedding","afterwork","christmas","corporate","birthday","gala","team_building","custom"]);
const THEME_PRESETS = new Set(["wedding-elegant","afterwork-urban","christmas-festive","corporate-premium","birthday-pop","gala-night","team-building-fresh","custom-neutral"]);

const DEFAULT_PRESET = {
  wedding:"wedding-elegant", afterwork:"afterwork-urban", christmas:"christmas-festive",
  corporate:"corporate-premium", birthday:"birthday-pop", gala:"gala-night",
  team_building:"team-building-fresh", custom:"custom-neutral",
};

const DEFAULT_MODULES = {
  wedding:{photoUpload:true,gallery:true,reactions:true,videoTestimonials:true,live:true,tvDisplay:true,schedule:false,practicalInfo:true,guestbook:false,qrCode:true},
  afterwork:{photoUpload:true,gallery:true,reactions:true,videoTestimonials:true,live:false,tvDisplay:true,schedule:true,practicalInfo:true,guestbook:false,qrCode:true},
  christmas:{photoUpload:true,gallery:true,reactions:true,videoTestimonials:true,live:false,tvDisplay:true,schedule:true,practicalInfo:true,guestbook:false,qrCode:true},
  corporate:{photoUpload:true,gallery:true,reactions:true,videoTestimonials:true,live:true,tvDisplay:true,schedule:true,practicalInfo:true,guestbook:false,qrCode:true},
  birthday:{photoUpload:true,gallery:true,reactions:true,videoTestimonials:true,live:false,tvDisplay:true,schedule:false,practicalInfo:false,guestbook:false,qrCode:true},
  gala:{photoUpload:true,gallery:true,reactions:true,videoTestimonials:true,live:true,tvDisplay:true,schedule:true,practicalInfo:true,guestbook:false,qrCode:true},
  team_building:{photoUpload:true,gallery:true,reactions:true,videoTestimonials:true,live:false,tvDisplay:true,schedule:true,practicalInfo:true,guestbook:false,qrCode:true},
  custom:{photoUpload:true,gallery:true,reactions:true,videoTestimonials:true,live:false,tvDisplay:true,schedule:false,practicalInfo:false,guestbook:false,qrCode:true},
};

const THEME_COLORS = {
  "wedding-elegant":{primary:"#5c2a1e",secondary:"#c97a6a",background:"#fdf8f4",surface:"#fffdf9",text:"#3d2010",muted:"#9e7060",accent:"#b89a6a",soft:"#f5ddd4"},
  "afterwork-urban":{primary:"#161a2d",secondary:"#d89b5b",background:"#f4f5f8",surface:"#ffffff",text:"#151827",muted:"#707486",accent:"#d89b5b",soft:"#e9eaf0"},
  "christmas-festive":{primary:"#17392f",secondary:"#b89a55",background:"#f7f3e9",surface:"#fffdf7",text:"#17312a",muted:"#6f746d",accent:"#c3a45e",soft:"#e8e1cf"},
  "corporate-premium":{primary:"#16243b",secondary:"#47698f",background:"#f4f6f8",surface:"#ffffff",text:"#172131",muted:"#687385",accent:"#47698f",soft:"#e3e8ee"},
  "birthday-pop":{primary:"#6b3cc7",secondary:"#ff6f61",background:"#fff8f4",surface:"#ffffff",text:"#2f2440",muted:"#7a6e84",accent:"#f2b84b",soft:"#f1e7ff"},
  "gala-night":{primary:"#111111",secondary:"#c2a66a",background:"#141414",surface:"#1e1e1e",text:"#f6f1e8",muted:"#b7aea1",accent:"#d2ba83",soft:"#2b2925"},
  "team-building-fresh":{primary:"#176b5b",secondary:"#e8a33c",background:"#f2f8f6",surface:"#ffffff",text:"#163b34",muted:"#68817b",accent:"#e8a33c",soft:"#dcefe9"},
  "custom-neutral":{primary:"#2b2d31",secondary:"#7b6d62",background:"#f6f4f2",surface:"#ffffff",text:"#252525",muted:"#77716d",accent:"#9a8371",soft:"#eae5e1"},
};

function eventType(value) {
  const type = String(value || "wedding").trim();
  return EVENT_TYPES.has(type) ? type : "custom";
}
function themePreset(value, type) {
  const preset = String(value || "");
  return THEME_PRESETS.has(preset) ? preset : DEFAULT_PRESET[eventType(type)];
}
function modules(value, type) {
  const base = DEFAULT_MODULES[eventType(type)];
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.keys(base).map(key => [key, typeof source[key] === "boolean" ? source[key] : base[key]]));
}
function theme(value, preset) {
  const base = THEME_COLORS[preset] || THEME_COLORS["custom-neutral"];
  const source = value && typeof value === "object" ? value : {};
  const color = key => /^#[0-9a-f]{6}$/i.test(String(source[key] || "")) ? String(source[key]).toLowerCase() : base[key];
  return {preset,primary:color("primary"),secondary:color("secondary"),background:color("background"),surface:color("surface"),text:color("text"),muted:color("muted"),accent:color("accent"),soft:color("soft")};
}
function labels(value) {
  if (!value || typeof value !== "object") return {};
  const allowed=["heroSubtitle","uploadTitle","uploadSubtitle","galleryTitle","gallerySubtitle","videoTitle","tvTitle","adminTitle","adminSubtitle","qrTitle","latest","galleryPage"];
  const out={};
  for(const key of allowed) if(typeof value[key]==="string") out[key]=value[key].trim().slice(0,180);
  return out;
}
function branding(value, organiserName="") {
  const source=value&&typeof value==="object"?value:{};
  return {
    logoUrl:typeof source.logoUrl==="string"?source.logoUrl.trim().slice(0,1200):"",
    coverUrl:typeof source.coverUrl==="string"?source.coverUrl.trim().slice(0,1200):"",
    organisationName:typeof source.organisationName==="string"?source.organisationName.trim().slice(0,120):String(organiserName||"").trim().slice(0,120),
    showPlatformBranding:source.showPlatformBranding!==false,
  };
}

module.exports={EVENT_TYPES,THEME_PRESETS,DEFAULT_PRESET,DEFAULT_MODULES,THEME_COLORS,eventType,themePreset,modules,theme,labels,branding};
