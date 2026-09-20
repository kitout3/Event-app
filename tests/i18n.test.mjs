import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "@babel/parser";
import { EVENT_TYPES, THEME_PRESETS, DEFAULT_LABELS, MODULE_META } from "../src/event-config.mjs";
import { BILLING_PLANS } from "../src/billing-config.mjs";

const read = path => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");
const catalogFiles = ["i18n-catalog","i18n-app","i18n-events"];
function runtime(initial = "fr", blockedStorage = false) {
  const listeners = {}, events = [];
  const document = {
    readyState:"loading", title:"Event-App · Vos événements", documentElement:{lang:"fr"},
    body:null, addEventListener(name,fn) { listeners[name] = fn; },
    querySelectorAll() { return []; },
    createTreeWalker(root) {
      let index = -1;
      return { nextNode() { return ++index < (root.nodes || []).length; }, get currentNode() { return root.nodes[index]; } };
    }
  };
  let stored = initial, dialog;
  const window = {addEventListener() {},dispatchEvent(event) { events.push(event); },confirm(message) { dialog = message; return false; }};
  const context = vm.createContext({
    window, document, navigator:{language:"fr"},
    localStorage:{getItem() { if (blockedStorage) throw new Error("blocked"); return stored; },setItem(_,value) { if (blockedStorage) throw new Error("blocked"); stored=value; }},
    MutationObserver:class {}, CustomEvent:class { constructor(name,options) { this.type=name;this.detail=options.detail; } },
    NodeFilter:{SHOW_TEXT:4},setTimeout,clearTimeout
  });
  for (const file of [...catalogFiles,"language-runtime"]) vm.runInContext(read("public/" + file + ".js"), context);
  return {i18n:window.EventI18n,rows:window.EVENT_TRANSLATIONS,document,window,listeners,events,get stored(){return stored;},get dialog(){return dialog;}};
}
function text(value, ignored = false) {
  let current = value, writes = 0;
  return {nodeType:3,parentElement:{closest:() => ignored ? {} : null},
    get nodeValue(){return current;},set nodeValue(value){current=value;writes++;},get writes(){return writes;}};
}
function input(attributes) {
  return {nodeType:1,nodes:[],value:"unchanged",closest:()=>null,querySelectorAll:()=>[],
    getAttribute:name=>attributes[name] || null,setAttribute:(name,value)=>{attributes[name]=value;},attributes};
}

test("every catalog entry has French, English, Vietnamese and German", () => {
  const {rows} = runtime();
  assert.ok(rows.length > 600);
  for (const row of rows) { assert.equal(row.length,4,row[0]); row.forEach(value=>assert.ok(typeof value==="string" && value.trim(),row[0])); }
});

test("all event types, theme descriptions, default labels and billing features are covered", () => {
  const {rows} = runtime();
  const sources = new Set(rows.map(row=>row[0].replaceAll("’","'")));
  const requireRow = value => assert.ok(sources.has(value.replaceAll("’","'")),value);
  Object.values(EVENT_TYPES).forEach(meta=>{requireRow(meta.label);requireRow(meta.description);});
  Object.values(THEME_PRESETS).forEach(meta=>{requireRow(meta.label);requireRow(meta.description);});
  Object.values(MODULE_META).forEach(meta=>requireRow(meta.label));
  Object.values(DEFAULT_LABELS).forEach(labels=>Object.values(labels).forEach(requireRow));
  Object.values(BILLING_PLANS).forEach(plan=>{requireRow(plan.label);requireRow(plan.description);plan.features.forEach(requireRow);});
});

test("static React labels and accessible field instructions have translations", () => {
  const {i18n,rows} = runtime();
  const neutral = new Set(["Event-","App","EVENT-APP","Huyen & Quentin","← Event-App","huyen-quentin","s ·","h"]);
  const covered = value => rows.some(row=>row.includes(value)) || ["en","vi","de"].some(lang=>i18n.translate(value,lang)!==value);
  const missing = [];
  for (const file of ["App.jsx","ClientAccount.jsx","SoftwareAdmin.jsx","AdminVideos.jsx","PasswordInput.jsx"]) {
    const ast = parse(read("src/"+file),{sourceType:"module",plugins:["jsx"]});
    function walk(node,parent) {
      if (!node || typeof node !== "object") return;
      const visible = node.type === "JSXText" || (node.type === "StringLiteral" && parent?.type === "JSXAttribute" && ["label","placeholder","title","aria-label","alt"].includes(parent.name.name));
      if (visible) {
        const value = node.value.replace(/\s+/g," ").trim();
        if (/\p{L}/u.test(value) && !neutral.has(value) && !covered(value)) missing.push(file+":"+node.loc.start.line+" "+value);
      }
      for (const [key,value] of Object.entries(node)) if(key!=="loc") Array.isArray(value)?value.forEach(child=>walk(child,node)):walk(value,node);
    }
    walk(ast);
  }
  assert.deepEqual(missing,[]);
});

test("language changes preserve French sources, handle React updates and settle without repeated writes", () => {
  const {i18n} = runtime();
  const node = text("Paramètres");
  i18n.setLanguage("de"); i18n.apply(node); assert.equal(node.nodeValue,"Einstellungen");
  for (let i=0;i<5;i++) i18n.apply(node);
  assert.equal(node.writes,1);
  i18n.setLanguage("vi"); i18n.apply(node); assert.equal(node.nodeValue,"Cài đặt");
  i18n.setLanguage("en"); i18n.apply(node); assert.equal(node.nodeValue,"Settings");
  node.nodeValue="Chargement des vidéos…"; i18n.apply(node); assert.equal(node.nodeValue,"Loading videos…");
  i18n.setLanguage("fr"); i18n.apply(node); assert.equal(node.nodeValue,"Chargement des vidéos…");
});

test("placeholders, accessibility labels and password buttons switch without touching values", () => {
  const {i18n} = runtime("de");
  const field = input({placeholder:"8 caractères minimum","aria-label":"Afficher le mot de passe"});
  i18n.apply(field);
  assert.equal(field.attributes.placeholder,"Mindestens 8 Zeichen");
  assert.equal(field.attributes["aria-label"],"Passwort anzeigen");
  assert.equal(field.value,"unchanged");
  field.attributes["aria-label"]="Masquer le mot de passe"; i18n.apply(field);
  assert.equal(field.attributes["aria-label"],"Passwort ausblenden");
  i18n.setLanguage("vi");i18n.apply(field);
  assert.equal(field.attributes.placeholder,"Ít nhất 8 ký tự");
});

test("decorated controls and dynamic counters work in all four languages", () => {
  const {i18n} = runtime();
  assert.equal(i18n.translate("← Retour à l’accueil","de"),"← Zurück zur Startseite");
  assert.equal(i18n.translate("✓ Publier (","en"),"✓ Publish (");
  assert.equal(i18n.translate("184 photos","vi"),"184 ảnh");
  assert.equal(i18n.translate("2 photos sélectionnées","de"),"2 Fotos ausgewählt");
  assert.equal(i18n.translate("Envoi de 2 photos…","en"),"Uploading 2 photos…");
  assert.equal(i18n.translate("29 média(s)","de"),"29 Medien");
  assert.equal(i18n.translate("Vorbereitung 50%","fr"),"Préparation 50%");
  assert.equal(i18n.t("Retirer la photo {count}",{count:4}),"Retirer la photo 4");
});

test("custom participant text and field values are never translated", () => {
  const {i18n} = runtime("de");
  const userMessage = text("Invité",true);
  i18n.apply(userMessage); assert.equal(userMessage.nodeValue,"Invité");
  assert.equal(i18n.translate("Quentin & Huyen"),"Quentin & Huyen");
  const field=input({placeholder:"Votre prénom"});field.value="Paramètres";
  i18n.apply(field);assert.equal(field.value,"Paramètres");
});

test("confirmation and validation messages use the selected language", () => {
  const state=runtime("de");
  state.window.confirm("Supprimer définitivement cette vidéo et son fichier ?");
  assert.equal(state.dialog,"Dieses Video und seine Datei endgültig löschen?");
  let message;
  state.listeners.invalid({target:{type:"email",validity:{typeMismatch:true,valid:false},setCustomValidity(value){message=value;}}});
  assert.equal(message,"Geben Sie eine gültige E-Mail-Adresse ein.");
  state.listeners.input({target:{setCustomValidity(value){message=value;}}});assert.equal(message,"");
});

test("German stays selected and unavailable browser storage does not break translation", () => {
  const state=runtime("de");assert.equal(state.i18n.language,"de");
  state.i18n.setLanguage("vi");assert.equal(state.stored,"vi");
  assert.equal(state.document.documentElement.lang,"fr"); // no body mounted in this harness
  assert.equal(state.events.at(-1).detail.language,"vi");
  const blocked=runtime(null,true);blocked.i18n.setLanguage("de");assert.equal(blocked.i18n.language,"de");
});

test("all entry points load one common translator before React", () => {
  for (const file of ["index.html","account.html","admin.html"]) {
    const html=read(file);
    for(const catalog of catalogFiles) assert.ok(html.includes(catalog+".js"),file);
    assert.ok(html.indexOf("language-runtime.js")<html.indexOf('type="module"'),file);
  }
  assert.ok(!read("src/main.jsx").includes("'language-runtime'"));
  assert.ok(!read("public/video-testimonials-v2.js").includes('if(e.target.closest("#wedding-language-switcher"))'));
});
