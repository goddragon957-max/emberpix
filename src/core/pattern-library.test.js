import assert from "node:assert/strict";
import test from "node:test";

import {
  PATTERN_LIBRARY_LIMIT,
  deletePatternItem,
  listPatternItems,
  savePatternItem,
} from "./pattern-library.js";

const THUMB = "data:image/png;base64,AAAA";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function pattern(size = 16, color = "#ff7a2f") {
  const pixels = new Array(size * size).fill(null);
  pixels[0] = color;
  pixels[size + 1] = color;
  return pixels;
}

function item(id, name = "하트", size = 16) {
  return { id, name, size, pattern: pattern(size), thumb: THUMB };
}

test("사용자 도안을 저장하고 최신순으로 다시 불러온다", () => {
  const storage = memoryStorage();

  assert.equal(savePatternItem(item("p1"), storage, 100).ok, true);
  assert.equal(savePatternItem(item("p2", "별"), storage, 200).ok, true);

  const listed = listPatternItems(storage, 16);
  assert.deepEqual(listed.map((entry) => entry.id), ["p2", "p1"]);
  assert.equal(listed[0].name, "별");
  assert.equal(listed[0].pattern[17], "#ff7a2f");
});

test("같은 도안은 갱신하고 크기별 목록과 삭제를 안전하게 처리한다", () => {
  const storage = memoryStorage();

  assert.equal(savePatternItem(item("p1", "처음"), storage, 100).ok, true);
  assert.equal(savePatternItem(item("p1", "갱신", 32), storage, 200).ok, true);
  assert.deepEqual(listPatternItems(storage, 16), []);
  assert.equal(listPatternItems(storage, 32)[0].name, "갱신");
  assert.deepEqual(deletePatternItem("없는 도안", storage), { ok: true, removed: false });
  assert.deepEqual(deletePatternItem("p1", storage), { ok: true, removed: true });
  assert.deepEqual(listPatternItems(storage), []);
});

test("사용자 도안은 최대 개수까지만 새로 추가한다", () => {
  const storage = memoryStorage();
  for (let i = 0; i < PATTERN_LIBRARY_LIMIT; i += 1) {
    assert.equal(savePatternItem(item(`p${i}`), storage, i).ok, true);
  }

  const result = savePatternItem(item("overflow"), storage, 999);
  assert.deepEqual(result, { ok: false, reason: "limit" });
  assert.equal(listPatternItems(storage).length, PATTERN_LIBRARY_LIMIT);
});
