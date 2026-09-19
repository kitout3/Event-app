import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_TYPES,
  THEME_PRESETS,
  DEFAULT_MODULES,
  eventDefaults,
  normalizeEventConfig,
  cssVarsForEvent,
} from "../src/event-config.mjs";

test("all supported event types resolve to a valid visual preset", () => {
  for (const [type, meta] of Object.entries(EVENT_TYPES)) {
    const defaults = eventDefaults(type);
    assert.equal(defaults.eventType, type);
    assert.ok(THEME_PRESETS[meta.defaultPreset], `missing preset for ${type}`);
    assert.equal(defaults.themePreset, meta.defaultPreset);
    assert.deepEqual(Object.keys(defaults.modules).sort(), Object.keys(DEFAULT_MODULES[type]).sort());
  }
});

test("legacy Huyen & Quentin remains a wedding while unknown events stay generic", () => {
  const legacy = normalizeEventConfig({ slug: "quentin-huyen-2026", name: "Huyen & Quentin" });
  assert.equal(legacy.eventType, "wedding");
  assert.equal(legacy.themePreset, "wedding-elegant");

  const generic = normalizeEventConfig({ slug: "company-party", eventType: "corporate" });
  assert.equal(generic.eventType, "corporate");
  assert.equal(generic.themePreset, "corporate-premium");
});

test("themes expose the CSS variables required by the event UI", () => {
  for (const type of Object.keys(EVENT_TYPES)) {
    const vars = cssVarsForEvent(eventDefaults(type));
    for (const key of ["--cream","--blush","--rose","--burgundy","--text","--muted","--white","--event-title-font","--event-body-font","--event-radius","--event-hero"]) {
      assert.ok(vars[key], `${type} missing ${key}`);
    }
  }
});

test("corporate and festive presets are visually distinct from wedding", () => {
  const wedding = cssVarsForEvent(eventDefaults("wedding"));
  const afterwork = cssVarsForEvent(eventDefaults("afterwork"));
  const christmas = cssVarsForEvent(eventDefaults("christmas"));
  const corporate = cssVarsForEvent(eventDefaults("corporate"));

  assert.notEqual(afterwork["--burgundy"], wedding["--burgundy"]);
  assert.notEqual(christmas["--burgundy"], wedding["--burgundy"]);
  assert.notEqual(corporate["--event-title-font"], wedding["--event-title-font"]);
});

test("new corporate defaults expose business-oriented modules", () => {
  const corporate = eventDefaults("corporate");
  assert.equal(corporate.modules.schedule, true);
  assert.equal(corporate.modules.practicalInfo, true);
  assert.equal(corporate.modules.live, true);
  assert.equal(corporate.modules.qrCode, true);
});
