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
  assert.equal(contextFor('https://kitout3.github.io/mariage-app/').eventId,'quentin-huyen-2026');
  for(const origin of ['https://wedding.example/','https://kitout3.github.io/mariage-app/']) {
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
  assert.equal(invitationSlug('https://kitout3.github.io/mariage-app/?w=other-wedding#gallery'),'other-wedding');
  assert.equal(weddingLink('https://wedding.example/','other-wedding',true),'https://wedding.example/?w=other-wedding#admin');
  assert.equal(weddingLink('https://kitout3.github.io/mariage-app/','other-wedding'),'https://kitout3.github.io/mariage-app/?w=other-wedding');
  for(const input of ['', 'https://example.com/', 'javascript:alert(1)', '?w=', '../quentin-huyen-2026']) assert.throws(()=>invitationSlug(input));
});

test('root and custom domains never redirect into the GitHub Pages prefix',()=>{
  const source=read('public/path-fix.js');
  let redirected=false;
  vm.runInNewContext(source,{window:{location:{hostname:'wedding.example',pathname:'/',replace:()=>{redirected=true;}}}});
  assert.equal(redirected,false);
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


test("custom domain build stays portable between GitHub Pages and app.souvenirdemariage.fr", () => {
  const workflow = read(".github/workflows/deploy.yml");
  const functions = read("functions/index.js");
  assert.match(workflow, /VITE_APP_BASE_PATH:\s*\.\//);
  assert.doesNotMatch(workflow, /VITE_APP_BASE_PATH:\s*\/mariage-app\//);
  assert.match(functions, /https:\/\/app\.souvenirdemariage\.fr\//);
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

test("event app separates TV and live routes and supports optional guestbook",()=>{
  const source=read("src/App.jsx");
  assert.match(source,/TV: "tv"/);
  assert.match(source,/GUESTBOOK: "guestbook"/);
  assert.match(source,/modules\.guestbook/);
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
  assert.match(billing,/essential/);
  assert.match(billing,/premium/);
  assert.match(billing,/signature/);
  assert.match(billing,/corporateAmount/);
});


test("temporary pricing is flat at 50 EUR for every event plan and segment",()=>{
  const client=read("src/billing-config.mjs");
  const server=read("functions/billing-config.js");
  assert.doesNotMatch(client,/privateAmount:\s*(?!5000)\d+/);
  assert.doesNotMatch(client,/corporateAmount:\s*(?!5000)\d+/);
  assert.doesNotMatch(server,/privateAmount:\s*(?!5000)\d+/);
  assert.doesNotMatch(server,/corporateAmount:\s*(?!5000)\d+/);
  assert.match(client,/privateAmount:\s*5000/);
  assert.match(server,/corporateAmount:\s*5000/);
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
