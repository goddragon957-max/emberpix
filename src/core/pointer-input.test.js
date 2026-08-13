import assert from "node:assert/strict";
import test from "node:test";

import { describePointer, normalizePointerType, pressureBrushSize } from "./pointer-input.js";

test("모바일 펜 Pointer Event를 펜 입력으로 식별하고 압력을 보존한다", () => {
  assert.equal(normalizePointerType("pen"), "pen");
  assert.deepEqual(describePointer({ pointerType: "pen", pressure: 0.72 }), {
    type: "pen",
    label: "펜",
    pressure: 0.72,
  });
});

test("손가락·마우스와 비표준 입력은 안전한 라벨로 정규화한다", () => {
  assert.deepEqual(describePointer({ pointerType: "touch", pressure: 0.5 }), {
    type: "touch",
    label: "터치",
    pressure: null,
  });
  assert.deepEqual(describePointer({ pointerType: "mouse" }), {
    type: "mouse",
    label: "마우스",
    pressure: null,
  });
  assert.deepEqual(describePointer({ pointerType: "unknown" }), {
    type: "unknown",
    label: "입력",
    pressure: null,
  });
});

test("강한 펜 압력은 그림 브러시를 한 단계 넓히고 보석 규칙은 호출부에서 고정할 수 있다", () => {
  assert.equal(pressureBrushSize(1, { pointerType: "pen", pressure: 0.2 }), 1);
  assert.equal(pressureBrushSize(1, { pointerType: "pen", pressure: 0.72 }), 2);
  assert.equal(pressureBrushSize(4, { pointerType: "pen", pressure: 1 }), 4);
  assert.equal(pressureBrushSize(3, { pointerType: "touch", pressure: 1 }), 3);
});
