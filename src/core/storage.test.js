import assert from "node:assert/strict";
import test from "node:test";

import { loadState, saveState } from "./storage.js";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

function makeFrame(size, color = null) {
  return Array.from({ length: size * size }, (_, index) => (index % (size + 1) === 0 ? color : null));
}

function makeState() {
  const size = 16;
  return {
    size,
    frames: [makeFrame(size, "#112233"), makeFrame(size, "#445566")],
    currentFrame: 1,
    color: "#ef7d57",
    reference: Array.from({ length: size * size }, (_, index) => (index === 0 ? 45 : 255)),
    refOpacity: 0.6,
    pattern: makeFrame(size, "#ffcd75"),
    palettes: {
      user: [{ name: "따뜻한 색", colors: ["#ffcd75", "#ef7d57"] }],
      active: 1,
      recent: ["#ef7d57", "#ffcd75"],
    },
    mode: "gem",
  };
}

test("자동 저장은 성공 여부를 돌려주고 전체 상태를 그대로 복구한다", () => {
  const storage = new MemoryStorage();
  const state = makeState();

  assert.deepEqual(saveState(state, storage), { ok: true });
  assert.deepEqual(loadState(storage), state);
});

test("자동 저장은 잘못된 상태를 거부하고 기존 저장본을 덮어쓰지 않는다", () => {
  const storage = new MemoryStorage();
  const original = makeState();
  saveState(original, storage);

  const invalid = {
    ...makeState(),
    size: 12,
  };

  assert.deepEqual(saveState(invalid, storage), { ok: false, reason: "invalid" });
  assert.deepEqual(loadState(storage), original);
});

test("자동 저장은 용량 초과가 나도 기존 저장본을 유지한다", () => {
  const storage = new MemoryStorage();
  const original = makeState();
  saveState(original, storage);

  storage.setItem = () => {
    const error = new Error("공간이 부족합니다");
    error.name = "QuotaExceededError";
    throw error;
  };

  assert.deepEqual(saveState({ ...makeState(), color: "#41a6f6" }, storage), { ok: false, reason: "quota" });
  assert.deepEqual(loadState(storage), original);
});

test("자동 저장은 저장소가 없으면 unavailable을 돌려주고 읽기도 null이다", () => {
  const storage = { getItem: undefined, setItem: undefined };
  assert.deepEqual(saveState(makeState(), storage), { ok: false, reason: "unavailable" });
  assert.equal(loadState(storage), null);
});

test("브라우저가 localStorage 접근 자체를 거부해도 화면을 깨뜨리지 않는다", (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("SecurityError"); } });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  });
  assert.deepEqual(saveState(makeState()), { ok: false, reason: "unavailable" });
  assert.equal(loadState(), null);
});

test("손상된 저장 JSON을 읽을 때 원본을 삭제하거나 갱신하지 않는다", () => {
  const storage = new MemoryStorage();
  storage.setItem("emberpix:autosave:v2", "{broken}");
  assert.equal(loadState(storage), null);
  assert.equal(storage.getItem("emberpix:autosave:v2"), "{broken}");
});

test("자동 저장은 v1 저장본도 읽어 현재 형식으로 복구한다", () => {
  const storage = new MemoryStorage();
  const size = 16;
  storage.setItem(
    "emberpix:autosave:v1",
    JSON.stringify({
      size,
      pixels: makeFrame(size, "#38b764"),
      color: "#38b764",
    })
  );

  assert.deepEqual(loadState(storage), {
    size,
    frames: [makeFrame(size, "#38b764")],
    currentFrame: 0,
    color: "#38b764",
    reference: null,
  });
});
