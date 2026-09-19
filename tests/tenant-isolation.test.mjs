import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from 'node:vm';
import {invitationSlug,weddingLink} from '../src/wedding-links.mjs';

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
