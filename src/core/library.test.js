import assert from "node:assert/strict";
import test from "node:test";

import {
  LIBRARY_KEY,
  LIBRARY_LIMIT,
  deleteLibraryItem,
  listLibraryItems,
  loadLibraryItem,
  saveLibraryItem,
} from "./library.js";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function state(color = "#ff7a2f") {
  return {
    size: 16,
    frames: [Array.from({ length: 16 * 16 }, () => null)],
    currentFrame: 0,
    color,
    reference: null,
    refOpacity: 1,
    pattern: null,
    palettes: null,
    mode: "draw",
  };
}

function artwork(id, name, color) {
  return {
    id,
    name,
    mode: "draw",
    size: 16,
    thumb: "data:image/png;base64,AA==",
    data: state(color),
  };
}

test("작품을 저장하고, 최신순으로 목록/불러오기/갱신한다", () => {
  const storage = new MemoryStorage();
  const first = saveLibraryItem(artwork("first", "첫 작품", "#112233"), storage, 100);
  const second = saveLibraryItem(artwork("second", "둘째 작품", "#445566"), storage, 200);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(listLibraryItems(storage).map((item) => item.id), ["second", "first"]);
  assert.equal(loadLibraryItem("first", storage).data.frames[0][0], null);

  const updated = saveLibraryItem(
    { ...artwork("first", "첫 작품 수정", "#778899"), updatedAt: 100 },
    storage,
    300
  );
  assert.equal(updated.ok, true);
  assert.equal(updated.item.updatedAt, 300);
  assert.equal(listLibraryItems(storage).length, 2);
  assert.equal(loadLibraryItem("first", storage).name, "첫 작품 수정");
  assert.equal(loadLibraryItem("first", storage).data.color, "#778899");
});

test("새 작품은 20개까지만 저장하고, 기존 작품 갱신은 허용한다", () => {
  const storage = new MemoryStorage();
  for (let index = 0; index < LIBRARY_LIMIT; index += 1) {
    assert.equal(saveLibraryItem(artwork(`art-${index}`, `작품 ${index}`), storage, index).ok, true);
  }

  const limited = saveLibraryItem(artwork("overflow", "넘치는 작품"), storage, 1000);
  assert.deepEqual(limited, { ok: false, reason: "limit" });
  assert.equal(listLibraryItems(storage).length, LIBRARY_LIMIT);

  const updated = saveLibraryItem(artwork("art-0", "첫 작품 다시 저장"), storage, 2000);
  assert.equal(updated.ok, true);
  assert.equal(listLibraryItems(storage).length, LIBRARY_LIMIT);
  assert.equal(loadLibraryItem("art-0", storage).name, "첫 작품 다시 저장");
});

test("작품을 삭제하고 없는 작품 삭제도 안전하게 처리한다", () => {
  const storage = new MemoryStorage();
  saveLibraryItem(artwork("first", "첫 작품"), storage, 100);

  assert.deepEqual(deleteLibraryItem("first", storage), { ok: true, removed: true });
  assert.equal(loadLibraryItem("first", storage), null);
  assert.deepEqual(deleteLibraryItem("missing", storage), { ok: true, removed: false });
});

test("용량 초과가 나도 기존 보관함 데이터와 현재 저장 결과를 보존한다", () => {
  const storage = new MemoryStorage();
  saveLibraryItem(artwork("first", "첫 작품"), storage, 100);
  const before = storage.getItem(LIBRARY_KEY);

  storage.setItem = () => {
    const error = new Error("공간이 부족합니다");
    error.name = "QuotaExceededError";
    throw error;
  };

  assert.deepEqual(saveLibraryItem(artwork("second", "둘째 작품"), storage, 200), {
    ok: false,
    reason: "quota",
  });
  assert.equal(storage.getItem(LIBRARY_KEY), before);
  assert.deepEqual(listLibraryItems(storage).map((item) => item.id), ["first"]);
});
