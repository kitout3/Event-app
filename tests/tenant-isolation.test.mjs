import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from 'node:vm';
import {invitationSlug,weddingLink} from '../src/wedding-links.mjs';
import {EVENT_TYPES,THEME_PRESETS,eventDefaults,normalizeEventConfig} from '../src/event-config.mjs';

const read = path => fs.readFileSync(path, "utf8");

test("tenant context accepts existing short slugs without cross-tenant fallback", () => {
  const source = read("public/tenant-context.js");
  const contextFor = href => {
    const context={URL,window:{location:{href}},document:{documentElement:{dataset:{}},currentScript:{src:new URL('tenant-context.js',href).href}}};
    vm.runInNewContext(source,context);
    return context.window.__WEDDING_TENANT__;
  };
  const root=contextFor('https://wedding.example/');
  assert.equal(root.hasWedding,false);
  assert.equal(root.isValid,false);
  assert.notEqual(root.eventId,'quentin-huyen-2026');
  const githubRoot=contextFor('https://kitout3.github.io/Event-app/');
  assert.equal(githubRoot.hasWedding,false);
  assert.equal(githubRoot.isValid,false);
  assert.notEqual(githubRoot.eventId,'quentin-huyen-2026');
  for(const origin of ['https://wedding.example/','https://kitout3.github.io/Event-app/']) {
    assert.equal(contextFor(`${origin}?w=ab`).eventId,'ab');
    assert.equal(contextFor(`${origin}?w=another-wedding`).eventId,'another-wedding');
    for(const input of ['','%2F','bad%20slug','%3Cscript%3E']) {
      assert.equal(contextFor(`${origin}?w=${input}`).isValid,false);
      assert.notEqual(contextFor(`${origin}?w=${input}`).eventId,'quentin-huyen-2026');
    }
  }
});

test('invitation links always open the selected wedding on the current deployment',()=>{
  assert.equal(invitationSlug(' AB '),'ab');
  assert.equal(invitationSlug('https://kitout3.github.io/Event-app/?w=other-wedding#gallery'),'other-wedding');
  assert.equal(weddingLink('https://wedding.example/','other-wedding',true),'https://wedding.example/?w=other-wedding#admin');
  assert.equal(weddingLink('https://kitout3.github.io/Event-app/','other-wedding'),'https://kitout3.github.io/Event-app/?w=other-wedding');
  for(const input of ['', 'https://example.com/', 'javascript:alert(1)', '?w=', '../quentin-huyen-2026']) assert.throws(()=>invitationSlug(input));
});

test('root and custom domains never redirect into the GitHub Pages prefix',()=>{
  const source=read('public/path-fix.js');
  let redirected=false;
  vm.runInNewContext(source,{URL,document:{currentScript:{src:'https://wedding.example/path-fix.js'}},window:{location:{href:'https://wedding.example/',hostname:'wedding.example',pathname:'/',replace:()=>{redirected=true;}}}});
  assert.equal(redirected,false);
  assert.doesNotMatch(source,/\/mariage-app\//);
  assert.match(source,/document\.currentScript/);
});

test("video gallery never reads the legacy global videoTestimonials collection", () => {
  const source = read("public/video-testimonials-v2.js");
  assert.doesNotMatch(source, /fs\.collection\(db\s*,\s*["']videoTestimonials["']\)/);
  assert.match(source, /fs\.collection\(db\s*,\s*["']events["']\s*,\s*EVENT_ID\s*,\s*["']videoTestimonials["']\)/);
  assert.match(source, /listPublicVideos/);
});

test("photo UI state and reads are scoped to the current wedding", () => {
  const source = read("src/App.jsx");
  assert.match(source, /wedding-photo-likes-v2:\$\{EVENT_ID\}/);
  assert.match(source, /where\("status",\s*"==",\s*"approved"\)/);
  assert.match(source, /where\("type",\s*"==",\s*"photoLike"\)/);
  assert.match(source, /DB\.onPhotos\(setPhotos, true\)/);
});

test("Firestore rules keep unapproved media private", () => {
  const source = read("firestore.rules");
  assert.match(source, /resource\.data\.status == "approved"/);
  assert.match(source, /match \/videoTestimonials\/\{videoId\}[\s\S]*allow read: if manages\(eventId\)/);
});

test("deleting a wedding removes tenant storage and Firestore data", () => {
  const source = read("functions/index.js");
  assert.match(source, /deleteFiles\(\{ prefix: `events\/\$\{eventId\}\/` \}\)/);
  assert.match(source, /recursiveDelete\(eventRef\)/);
});

test("Storage validates photo and video MIME types", () => {
  const source = read("storage.rules");
  assert.match(source, /contentType\.matches\('\^image\/\.\*'\)/);
  assert.match(source, /contentType\.matches\('\^video\/\(mp4\|quicktime\|webm\)'\)/);
});


test("the build stays portable between GitHub Pages and a custom domain", () => {
  const workflow = read(".github/workflows/deploy.yml");
  const functions = read("functions/index.js");
  assert.match(workflow, /VITE_APP_BASE_PATH:\s*\.\//);
  assert.doesNotMatch(workflow, /VITE_APP_BASE_PATH:\s*\/mariage-app\//);
  assert.match(functions, /https:\/\/kitout3\.github\.io\/Event-app\//);
});


test("multi-event presets produce distinct visual and functional defaults",()=>{
  for(const type of ["wedding","afterwork","christmas","corporate","birthday","gala","team_building","custom"]) {
    assert.ok(EVENT_TYPES[type], `missing event type ${type}`);
    const config=eventDefaults(type);
    assert.ok(THEME_PRESETS[config.themePreset], `missing preset for ${type}`);
    assert.equal(config.eventType,type);
    assert.equal(typeof config.modules.photoUpload,"boolean");
    assert.equal(typeof config.labels.galleryTitle,"string");
  }
  assert.notEqual(eventDefaults("wedding").theme.primary,eventDefaults("afterwork").theme.primary);
  assert.notEqual(eventDefaults("christmas").theme.primary,eventDefaults("corporate").theme.primary);
  assert.equal(eventDefaults("corporate").modules.schedule,true);
  assert.equal(eventDefaults("birthday").modules.live,false);
});

test("legacy Huyen and Quentin remains a wedding while other untyped events stay generic",()=>{
  assert.equal(normalizeEventConfig({slug:"quentin-huyen-2026"}).eventType,"wedding");
  assert.equal(normalizeEventConfig({slug:"legacy-company-party"}).eventType,"custom");
});

test("software admin exposes type, theme, module and preview creation steps",()=>{
  const source=read("src/SoftwareAdmin.jsx");
  assert.match(source,/Nouvel événement/);
  assert.match(source,/Créer un espace/);
  assert.match(source,/Style & modules/);
  assert.match(source,/EventPreview/);
  assert.match(source,/eventType/);
  assert.match(source,/themePreset/);
});

test("event app separates TV and live routes while guestbook is hidden from home",()=>{
  const source=read("src/App.jsx");
  assert.match(source,/TV: "tv"/);
  assert.match(source,/GUESTBOOK: "guestbook"/);
  assert.doesNotMatch(source,/modules\.guestbook\s*&&\s*\{/);
  assert.match(source,/guestbookMessages/);
});

test("guestbook is isolated under each event and public reads require approved status",()=>{
  const rules=read("firestore.rules");
  assert.match(rules,/match \/guestbookMessages\/\{messageId\}/);
  assert.match(rules,/resource\.data\.status == "approved"/);
  const app=read("src/App.jsx");
  assert.match(app,/collection\(_db, "events", EVENT_ID, "guestbookMessages"\)/);
});

test("legacy wedding-specific controllers are no longer loaded by the app runtime",()=>{
  const main=read("src/main.jsx");
  assert.doesNotMatch(main,/language-controller-v2/);
  assert.doesNotMatch(main,/account-customization/);
});


test("customer account supports multiple paid events per owner",()=>{
  const account=read("src/ClientAccount.jsx");
  const functions=read("functions/index.js");
  const vite=read("vite.config.js");
  assert.match(vite,/clientAccount:\s*resolve\(__dirname,\s*'account\.html'\)/);
  assert.match(account,/createUserWithEmailAndPassword/);
  assert.match(account,/listMyEvents/);
  assert.match(account,/createClientEventDraft/);
  assert.match(account,/createEventCheckoutSession/);
  assert.match(functions,/exports\.listMyEvents/);
  assert.match(functions,/where\("ownerUid",\s*"==",\s*request\.auth\.uid\)/);
  assert.doesNotMatch(functions,/admin-already-used/);
});

test("self-service drafts stay inactive until a verified Stripe payment",()=>{
  const functions=read("functions/index.js");
  assert.match(functions,/exports\.createClientEventDraft/);
  assert.match(functions,/active:\s*false/);
  assert.match(functions,/status:\s*"payment_pending"/);
  assert.match(functions,/billing:\s*\{[\s\S]*source:\s*"stripe"[\s\S]*status:\s*"unpaid"/);
  assert.match(functions,/exports\.stripeWebhook/);
  assert.match(functions,/constructEvent\(/);
  assert.match(functions,/payment_status !== "paid"/);
  assert.match(functions,/active:\s*true,[\s\S]*status:\s*"active"/);
});

test("customer browsers cannot forge payment or activation state",()=>{
  const rules=read("firestore.rules");
  assert.match(rules,/affectedKeys\(\)\.hasAny\(\[[\s\S]*"active"[\s\S]*"status"[\s\S]*"billing"/);
  assert.match(rules,/allow delete: if platformAdmin\(\)/);
});

test("deleting one event does not delete a multi-event customer account",()=>{
  const functions=read("functions/index.js");
  const start=functions.indexOf("exports.deleteWedding");
  const end=functions.indexOf("exports.listWeddings",start);
  const block=functions.slice(start,end);
  assert.doesNotMatch(block,/deleteUser\(/);
});

test("billing amounts are quoted again on the trusted backend",()=>{
  const functions=read("functions/index.js");
  const billing=read("functions/billing-config.js");
  assert.match(functions,/billingConfig\.quote\(event\.billing\?\.planId,\s*event\.eventType\)/);
  assert.match(billing,/event:\s*\{/);
  assert.match(billing,/privateAmount:3000/);
  assert.match(billing,/corporateAmount:3000/);
  assert.match(billing,/LEGACY_PLAN_ALIASES/);
});


test("Event-App exposes one 30 EUR offer while legacy plan ids map to it",()=>{
  const client=read("src/billing-config.mjs");
  const server=read("functions/billing-config.js");
  const account=read("src/ClientAccount.jsx");
  const functionsSource=read("functions/index.js");
  assert.match(client,/export const BILLING_PLANS = \{\s*event:/);
  assert.doesNotMatch(client,/\n\s*essential:\s*\{/);
  assert.doesNotMatch(client,/\n\s*premium:\s*\{/);
  assert.doesNotMatch(client,/\n\s*signature:\s*\{/);
  assert.match(client,/privateAmount:\s*3000/);
  assert.match(client,/corporateAmount:\s*3000/);
  assert.match(server,/privateAmount:3000/);
  assert.match(server,/corporateAmount:3000/);
  assert.match(server,/essential:"event"/);
  assert.match(server,/premium:"event"/);
  assert.match(server,/signature:"event"/);
  assert.match(account,/planId:"event"/);
  assert.match(account,/30 € par événement/);
  assert.match(functionsSource,/billingConfig\.quote\(data\.planId \|\| "event", eventType\)/);
});


test("event home keeps video message, video gallery and live entry points",()=>{
  const app=read("src/App.jsx");
  const video=read("public/video-testimonials-v2.js");
  assert.match(app,/modules\.videoTestimonials\s*&&\s*\{\s*id:"vt-home-card"/);
  assert.match(app,/modules\.videoTestimonials\s*&&\s*\{\s*id:"vt-gallery-card"/);
  assert.match(app,/modules\.live\s*&&\s*\{\s*id:"wedding-live-card"/);
  assert.match(app,/hash:"video"/);
  assert.match(app,/hash:"video-gallery"/);
  assert.match(app,/hash:"live"/);
  assert.match(video,/addEventListener\("hashchange",refresh\)/);
});


test("mobile video gallery preserves native vertical scrolling below the global language header",()=>{
  const video=read("public/video-testimonials-v2.js");
  const enhancer=read("public/app-enhancer.js");
  assert.match(video,/height:100dvh/);
  assert.match(video,/overflow-y:auto!important/);
  assert.match(video,/-webkit-overflow-scrolling:touch/);
  assert.match(video,/touch-action:pan-y/);
  assert.match(video,/vt-toolbar/);
  assert.match(video,/dockLanguageSwitcher/);
  assert.match(video,/padding:calc\(var\(--event-header-reserve,68px\) \+ 10px\)/);
  assert.match(video,/\.vt-gallery-item video\{pointer-events:none!important/);
  assert.match(enhancer,/#wedding-language-switcher\{[\s\S]*width:auto!important[\s\S]*max-width:max-content!important/);
});


test("mobile gallery places its controls below the reserved language area",()=>{
  const video=read("public/video-testimonials-v2.js");
  const app=read("src/App.jsx");
  const config=read("src/event-config.mjs");
  assert.match(video,/vt-toolbar/);
  assert.match(video,/restoreLanguageSwitcher/);
  assert.doesNotMatch(video,/vt-language-slot/);
  assert.doesNotMatch(video,/enableMobileOverlayScroll/);
  assert.doesNotMatch(video,/el\.scrollTop\+=delta/);
  assert.doesNotMatch(app,/title:"Livre d’or"/);
  assert.doesNotMatch(config,/guestbook:\s*\{\s*label:"Livre d'or"/);
});


test("compact language pill is controlled globally for every event header",()=>{
  const enhancer=read("public/app-enhancer.js");
  assert.match(enhancer,/#wedding-language-switcher\{[\s\S]*right:16px!important[\s\S]*width:auto!important[\s\S]*max-width:max-content!important/);
  assert.match(enhancer,/#wedding-language-switcher button\{[\s\S]*padding:7px 10px!important[\s\S]*font-size:11px!important/);
});

test("media download bar is visible over video gallery and removed outside media views",()=>{
  const media=read("public/media-selection.js");
  assert.match(media,/\.ms-bar\{position:fixed;z-index:2147483646/);
  assert.match(media,/if \(!available\.length\) \{ bar\?\.remove\(\); return; \}/);
  assert.doesNotMatch(media,/if \(!available\.length && !selected\.size\)/);
});


test("video gallery scrolls inside a dedicated iOS shell",()=>{
  const video=read("public/video-testimonials-v2.js");
  assert.match(video,/\.vt-overlay\{[^}]*overflow:hidden!important/);
  assert.match(video,/\.vt-shell\{[^}]*height:100dvh[^}]*overflow-y:auto!important[^}]*-webkit-overflow-scrolling:touch[^}]*touch-action:pan-y/);
  assert.match(video,/@media \(max-width:650px\)\{[\s\S]*\.vt-shell\{[^}]*height:100dvh/);
});

test("download banner belongs to active gallery and is destroyed on navigation",()=>{
  const media=read("public/media-selection.js");
  assert.match(media,/function activeMediaRoot\(\)/);
  assert.match(media,/document\.querySelector\('#vt-overlay \.vt-gallery-grid'\)\?\.closest\('#vt-overlay'\)/);
  assert.match(media,/isActuallyVisible/);
  assert.match(media,/root\.id === 'vt-overlay' \? root : document\.body/);
  assert.match(media,/hashchange', \(\) => \{[\s\S]*media-selection-bar'\)\?\.remove\(\)/);
});


test("all event pages keep only the compact language pill fixed with a small initial gap",()=>{
  const enhancer=read("public/app-enhancer.js");
  const app=read("src/App.jsx");
  const video=read("public/video-testimonials-v2.js");
  assert.match(enhancer,/--event-header-reserve:calc\(env\(safe-area-inset-top\) \+ 64px\)/);
  assert.match(enhancer,/body\.event-language-layout #root/);
  assert.doesNotMatch(enhancer,/body\.event-language-layout::before/);
  assert.match(enhancer,/right:16px!important/);
  assert.match(enhancer,/font-size:11px!important/);
  assert.match(enhancer,/document\.body\.classList\.add\("event-language-layout"\)/);
  assert.doesNotMatch(app,/position: "sticky"/);
  assert.doesNotMatch(app,/top: "var\(--event-header-reserve/);
  assert.match(video,/padding:calc\(var\(--event-header-reserve,68px\) \+ 10px\)/);
  assert.doesNotMatch(video,/vt-language-slot/);
});


test("Event-App root is login/signup and never auto-opens Huyen & Quentin",()=>{
  const main=read("src/main.jsx");
  const tenant=read("public/tenant-context.js");
  const index=read("index.html");
  assert.match(main,/import ClientAccount from '\.\/ClientAccount\.jsx'/);
  assert.match(main,/: <ClientAccount \/>/);
  assert.doesNotMatch(main,/import Portal from/);
  assert.match(tenant,/const hasWedding = requested !== null/);
  assert.doesNotMatch(tenant,/LEGACY_DEFAULT_EVENT_ID/);
  assert.match(index,/<title>Event-App · Vos événements<\/title>/);
});

test("Huyen and Quentin event requires an authenticated authorized account",()=>{
  const app=read("src/App.jsx");
  const rules=read("firestore.rules");
  const storage=read("storage.rules");
  const functions=read("functions/index.js");
  assert.match(app,/PRIVATE_EVENT_IDS = new Set\(\["quentin-huyen-2026"\]\)/);
  assert.match(app,/PrivateEventAccess/);
  assert.match(app,/privateAccessEmails/);
  assert.match(rules,/function privateEvent\(eventId\)/);
  assert.match(rules,/eventId == 'quentin-huyen-2026'/);
  assert.match(rules,/invitedToPrivateEvent/);
  assert.match(storage,/function attendeeAccess\(eventId\)/);
  assert.match(functions,/requestCanAccessPrivateEvent/);
  assert.match(functions,/throw new HttpsError\("permission-denied", "Cet événement est privé\."\)/);
});

test("event settings can clear logo and cover image",()=>{
  const app=read("src/App.jsx");
  assert.match(app,/Supprimer le logo/);
  assert.match(app,/setNested\("branding","logoUrl",""\)/);
  assert.match(app,/Supprimer l’image de couverture/);
  assert.match(app,/setNested\("branding","coverUrl",""\)/);
  assert.match(app,/Aucun logo/);
  assert.match(app,/Aucune image de couverture/);
});

test("Firebase rules deploy independently from Stripe-backed functions",()=>{
  const workflow=read(".github/workflows/firebase-backend.yml");
  const functions=read("functions/index.js");
  assert.match(workflow,/jobs:\s*[\s\S]*rules:/);
  assert.match(workflow,/--only firestore:rules,storage/);
  assert.match(workflow,/core_functions:[\s\S]*--only functions:createWedding[\s\S]*functions:listPublicVideos[\s\S]*functions:listMyEvents/);
  assert.match(workflow,/stripe_functions:[\s\S]*workflow_dispatch[\s\S]*deploy_stripe[\s\S]*functions:createEventCheckoutSession[\s\S]*functions:stripeWebhook/);
  assert.doesNotMatch(functions,/defineSecret/);
  assert.match(functions,/secrets:\s*\[STRIPE_SECRET_KEY\]/);
});
