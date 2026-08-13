import assert from "node:assert/strict";
import test from "node:test";

import { applyGemCell } from "./gem-input.js";

const pattern = [
  null, "#ff7a2f", null,
  "#38b764", "#ff7a2f", "#38b764",
  null, "#38b764", null,
];

function blankPixels() {
  return new Array(pattern.length).fill(null);
}

test("보석 한 번 누르기는 브러시 상태와 무관하게 한 칸만 채운다", () => {
  const pixels = blankPixels();

  const changed = applyGemCell(pixels, pattern, 3, 1, 1, null);

  assert.equal(changed, true);
  assert.deepEqual(pixels, [
    null, null, null,
    null, "#ff7a2f", null,
    null, null, null,
  ]);
});

test("배경·필터 불일치·이미 채운 칸은 변경하지 않는다", () => {
  const pixels = blankPixels();

  assert.equal(applyGemCell(pixels, pattern, 3, 0, 0, null), false);
  assert.equal(applyGemCell(pixels, pattern, 3, 1, 1, "#38b764"), false);
  assert.equal(applyGemCell(pixels, pattern, 3, 1, 1, null), true);
  assert.equal(applyGemCell(pixels, pattern, 3, 1, 1, null), false);
  assert.equal(pixels.filter(Boolean).length, 1);
});
