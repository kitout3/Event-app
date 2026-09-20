import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import { guestLoginError } from "../src/auth-errors.mjs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function loginFixture() {
  const source = read("functions/index.js");
  const start = source.indexOf("exports.loginPrivateEvent =");
  const end = source.indexOf("exports.createWedding =", start);
  const password = "test-only-password";
  const hash = value => crypto.pbkdf2Sync(value, "test-salt", 210000, 32, "sha256").toString("hex");
  const credentials = { accessId: "test-guests", salt: "test-salt", passwordHash: hash(password) };
  const calls = [];
  const doc = {
    collection: () => doc, doc: () => doc,
    get: async () => ({ exists: true, data: () => credentials }),
    update: async value => calls.push(["update", value]),
  };
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const context = {
    exports: {}, onCall: (_, fn) => fn, HttpsError, Buffer, crypto,
    PRIVATE_EVENT_IDS: new Set(["quentin-huyen-2026"]),
    normalizeSlug: value => String(value || "").toLowerCase(),
    normalizeAccessId: value => String(value || "").normalize("NFKC").trim().toLowerCase(),
    hashPrivatePassword: hash,
    getFirestore: () => doc,
    FieldValue: { serverTimestamp: () => "test-timestamp" },
    upsertPrivateEventGuest: async (...args) => { calls.push(["auth", ...args]); return { uid: "guest-test", email: "test@example.invalid" }; },
  };
  vm.runInNewContext(source.slice(start, end), context);
  return { login: context.exports.loginPrivateEvent, password, calls };
}

test("homepage resolves guest credentials without an event ID", async () => {
  const { login, password, calls } = loginFixture();
  const result = await login({ data: { accessId: " TEST-GUESTS ", password } });
  assert.equal(result.eventId, "quentin-huyen-2026");
  assert.equal(result.email, "test@example.invalid");
  assert.equal(calls[0][0], "auth");
});

test("direct event login preserves its requested event", async () => {
  const { login, password } = loginFixture();
  const result = await login({ data: { eventId: "quentin-huyen-2026", accessId: "test-guests", password } });
  assert.equal(result.eventId, "quentin-huyen-2026");
});

test("unknown ID and wrong password do not create a guest session", async () => {
  const { login, password, calls } = loginFixture();
  await assert.rejects(login({ data: { accessId: "unknown", password } }), { code: "permission-denied" });
  await assert.rejects(login({ data: { accessId: "test-guests", password: "incorrect" } }), { code: "permission-denied" });
  assert.equal(calls.length, 0);
});

test("explicit unsupported event does not fall back to another event", async () => {
  const { login, password, calls } = loginFixture();
  await assert.rejects(login({ data: { eventId: "other-event", accessId: "test-guests", password } }), { code: "invalid-argument" });
  assert.equal(calls.length, 0);
});

test("service errors are distinct from rejected credentials", () => {
  assert.match(guestLoginError({ code: "functions/permission-denied" }), /incorrect/);
  assert.match(guestLoginError({ code: "functions/internal" }), /service/);
  assert.doesNotMatch(guestLoginError({ code: "functions/internal" }), /incorrect/);
});

test("password visibility is shared across login and settings screens", () => {
  const component = read("src/PasswordInput.jsx");
  assert.match(component, /visible \? "text" : "password"/);
  assert.match(component, /type="button"/);
  assert.match(component, /aria-pressed/);
  for (const path of ["src/App.jsx", "src/ClientAccount.jsx", "src/SoftwareAdmin.jsx"]) {
    assert.match(read(path), /<PasswordInput/);
    assert.doesNotMatch(read(path), /<input[^>]*type="password"/);
  }
});

test("homepage separates organizer and guest journeys", () => {
  const source = read("src/ClientAccount.jsx");
  assert.match(source, /Organisateur/);
  assert.match(source, /Invité/);
  assert.match(source, /S’inscrire/);
  assert.match(source, /onSubmit=\{submitGuest\}/);
  assert.match(source, /startsWith\("event-guest-"\)/);
  assert.match(source, /window.location.assign\(EVENT_URL\(eventId\)\)/);
  assert.match(read("src/App.jsx"), /Référence de l’événement \(URL\)/);
});
