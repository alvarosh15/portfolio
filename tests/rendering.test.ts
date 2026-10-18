import assert from "node:assert/strict";
import { test } from "node:test";
import { createFrameCache } from "../src/scripts/frame-cache";
import { compose, toPaths, type Layer } from "../src/scripts/sprites";
import { readablePath } from "../src/scripts/pathname";
import { publishedPosts } from "../src/data/published-posts";

test("cached frames preserve layering, clipping, transparency and mirroring", () => {
  const frame = createFrameCache(3, 2);
  const layers: Layer[] = [[["#w", "r."], -1, 0], [[".b"], 0, 1]];
  for (const mirror of [false, true]) {
    assert.deepEqual(frame(layers, mirror), toPaths(compose(layers, 3, 2, mirror)));
  }
  assert.notDeepEqual(frame(layers), frame(layers, true));
});

test("equivalent fresh grids reuse frames and changed coordinates do not", () => {
  const frame = createFrameCache(3, 2);
  const first = frame([[["#"], 0, 0]]);
  assert.equal(frame([[["#"], 0, 0]]), first);
  assert.notEqual(frame([[["#"], 1, 0]]), first);
  assert.notEqual(frame([[["w"], 0, 0]]), first);
});

test("frame eviction bounds memory without changing a regenerated drawing", () => {
  const frame = createFrameCache(3, 2, 2);
  const first = frame([[["#"], 0, 0]]);
  frame([[["#"], 1, 0]]);
  frame([[["#"], 2, 0]]);
  const regenerated = frame([[["#"], 0, 0]]);
  assert.notEqual(regenerated, first);
  assert.deepEqual(regenerated, first);
});

test("404 paths decode valid text and tolerate invalid escapes", () => {
  assert.equal(readablePath("/caf%C3%A9"), "/café");
  assert.equal(readablePath("/%E0%A4%A"), "/%E0%A4%A");
  assert.equal(readablePath("/100%"), "/100%");
});

test("published posts exclude drafts, sort newest first and leave input untouched", () => {
  const post = (id: string, date: string, draft = false) => ({ id, data: { date: new Date(date), draft } });
  const posts = [post("old", "2025-01-01"), post("draft", "2027-01-01", true), post("new", "2026-01-01")];
  assert.deepEqual(publishedPosts(posts).map((p) => p.id), ["new", "old"]);
  assert.deepEqual(posts.map((p) => p.id), ["old", "draft", "new"]);
});
