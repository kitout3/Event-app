import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "@babel/parser";
import { mosaicCells, mosaicSlots, reconcileMosaicSlots, normalizeMosaicConfig, MOSAIC_FORMATS, fitMosaic, zoomMosaicAt, clampMosaicCamera, mosaicPoint } from "../src/mosaic-config.mjs";
import { eventDefaults, normalizeEventConfig } from "../src/event-config.mjs";

const photos = count => Array.from({ length: count }, (_, index) => ({ id: `p${index}`, status: "approved", thumbnail: `https://example.invalid/${index}.jpg` }));

test("mosaic capacity and image settings are bounded and independent for each event", () => {
  const source = { type: "photo", count: "997", strength: 75, photoUrl: "https://example.invalid/image.jpg", format: "portrait", repeat: false };
  const first = normalizeEventConfig({ ...eventDefaults("wedding"), displayMode: "mosaic", tvMosaic: source });
  assert.equal(first.tvMosaic.count, 997); assert.equal(first.displayMode, "mosaic");
  first.tvMosaic.count = 100;
  assert.equal(source.count, "997");
  assert.equal(normalizeEventConfig({}).tvMosaic.count, 400);
  assert.equal(normalizeMosaicConfig({ count: -1 }).count, 25);
  assert.equal(normalizeMosaicConfig({ count: 100000 }).count, 2500);
  assert.equal(normalizeMosaicConfig({ count: NaN }).count, 400);
  assert.equal(normalizeMosaicConfig({ logoUrl: "javascript:alert(1)", type: "other", strength: 200, background: "invalid" }).logoUrl, "");
  assert.equal(normalizeMosaicConfig(null).type, "text");
});

test("every supported format has exactly the requested cells with no holes or overlapping area", () => {
  for (const count of [25, 100, 237, 400, 997, 1600, 2500]) for (const aspect of Object.values(MOSAIC_FORMATS)) {
    const cells = mosaicCells(count, aspect);
    assert.equal(cells.length, count);
    const rows = new Map();
    let area = 0;
    for (const cell of cells) {
      assert.ok(cell.x >= 0 && cell.y >= 0 && cell.x + cell.width < 1.000001 && cell.y + cell.height < 1.000001);
      area += cell.width * cell.height;
      if (!rows.has(cell.y)) rows.set(cell.y, []);
      rows.get(cell.y).push(cell);
    }
    assert.ok(Math.abs(area - 1) < 1e-9);
    for (const row of rows.values()) {
      for (let index = 1; index < row.length; index++) assert.ok(Math.abs(row[index].x - row[index - 1].x - row[index - 1].width) < 1e-9);
    }
  }
});

test("progressive filling uses approved unique photos and adds arrivals without inventing participants", () => {
  const original = photos(3);
  const excluded = [{ id: "pending", status: "pending", url: "pending" }, { id: "rejected", status: "rejected", url: "rejected" }, original[0], { id: "empty", status: "approved" }];
  const before = mosaicSlots([...original, ...excluded], 100);
  assert.equal(before.filter(Boolean).length, 3);
  assert.equal(new Set(before.filter(Boolean).map(photo => photo.id)).size, 3);
  const after = mosaicSlots([...original, photos(4)[3]], 100, before.map(photo => photo?.id || null));
  assert.equal(after.filter(Boolean).length, 4);
  before.forEach((photo, index) => { if (photo) assert.equal(after[index].id, photo.id); });
  assert.equal(mosaicSlots([], 400, true).filter(Boolean).length, 0);
  assert.equal(mosaicSlots(original, 400).filter(Boolean).length, 3);
  assert.equal(normalizeMosaicConfig({repeat:true}).repeat, false);
});

test("full walls stay static and late approvals or removals do not shift existing photos", () => {
  const source = photos(100);
  const initial = reconcileMosaicSlots([], source, 100);
  const more = [...source, {id:"new-late-photo",status:"approved",url:"new.jpg",createdAt:"2000-01-01"}];
  assert.deepEqual(reconcileMosaicSlots(initial, more, 100), initial);
  const removed = source.filter(photo => photo.id !== "p4");
  const next = reconcileMosaicSlots(initial, [...removed, more.at(-1)], 100);
  initial.forEach((id,index) => assert.equal(next[index],id === "p4" ? "new-late-photo" : id));
  const subset = reconcileMosaicSlots([], source.slice(0,40), 100);
  const late = reconcileMosaicSlots(subset,[...source.slice(0,40),more.at(-1)],100);
  subset.forEach((id,index) => { if(id)assert.equal(late[index],id); });
  const shuffled = [...more].reverse().map(photo=>({...photo,likes:99,createdAt:"2026-10-01"}));
  assert.deepEqual(reconcileMosaicSlots(initial,shuffled,100), initial);
});

test("zoom stays anchored under the pointer and panning reaches all sides of the mosaic", () => {
  const viewport={width:1200,height:800},content=fitMosaic(viewport,16/9);
  const camera={scale:2,x:0,y:0},point={x:700,y:430};
  const before=mosaicPoint(point,camera,viewport,content);
  const enlarged=zoomMosaicAt(camera,4,point,viewport,content);
  const after=mosaicPoint(point,enlarged,viewport,content);
  assert.ok(Math.abs(before.x-after.x)<1e-9 && Math.abs(before.y-after.y)<1e-9);
  const topLeft=clampMosaicCamera({scale:4,x:1e6,y:1e6},viewport,content);
  const origin=mosaicPoint({x:0,y:0},topLeft,viewport,content);
  assert.ok(Math.abs(origin.x)<1e-9 && Math.abs(origin.y)<1e-9);
  const bottomRight=clampMosaicCamera({scale:4,x:-1e6,y:-1e6},viewport,content);
  const end=mosaicPoint({x:1200,y:800},bottomRight,viewport,content);
  assert.ok(Math.abs(end.x-1)<1e-9 && Math.abs(end.y-1)<1e-9);
  assert.deepEqual(clampMosaicCamera({scale:0,x:10,y:100},viewport,content),{scale:1,x:0,y:0});
});

test("mosaic subscriptions and image uploads use only the current event paths", async () => {
  const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  const database = ast.program.body.flatMap(node => node.declarations || []).find(node => node.id.name === "DB").init;
  const paths = [], writes = [];
  let deliver, stopped = false;
  const context = { _firebaseReady: true, _db: {}, _storage: {}, EVENT_ID: "owner-event", normalizeEventConfig, console, window: { __fb: {
    doc: (_, ...parts) => { paths.push(parts); return parts; },
    onSnapshot: (_, next) => { deliver = next; return () => { stopped = true; }; },
    ref: (_, path) => { paths.push(path); return path; },
    uploadBytes: async (path, file, metadata) => { writes.push({ path, file, metadata }); },
    getDownloadURL: async path => `https://storage.example.invalid/${path}`,
  } } };
  for (const name of ["onEvent", "uploadBrandAsset"]) {
    const method = database.properties.find(property => property.key.name === name).value;
    context[name] = vm.runInNewContext(`(${source.slice(method.start, method.end)})`, context);
  }
  let received;
  const unsubscribe = context.onEvent(event => { received = event; });
  deliver({ exists: () => true, data: () => ({ name: "Test", tvMosaic: { count: 900 } }) });
  assert.equal(received.id, "owner-event"); assert.equal(received.tvMosaic.count, 900);
  assert.deepEqual(paths[0], ["events", "owner-event"]);
  const url = await context.uploadBrandAsset({ name: "logo.png", type: "image/png" }, "mosaic");
  assert.match(url, /^https:\/\/storage.example.invalid\/events\/owner-event\/branding\/mosaic_\d+\.png$/);
  assert.equal(writes[0].metadata.customMetadata.eventId, "owner-event");
  unsubscribe(); assert.equal(stopped, true);
});
