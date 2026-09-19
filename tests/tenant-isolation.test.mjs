import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");

test("tenant context accepts existing short slugs without cross-tenant fallback", () => {
  const source = read("public/tenant-context.js");
  assert.match(source, /\{0,79\}/);
  assert.match(source, /requested === null\s*\?\s*LEGACY_DEFAULT_EVENT_ID/);
  assert.match(source, /__invalid_wedding__/);
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
