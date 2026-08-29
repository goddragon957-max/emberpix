import assert from "node:assert/strict";
import test from "node:test";
import { createHistory, MAX_UNDO } from "./history.js";

test("히스토리는 스냅샷을 복사하며 두 프레임의 undo를 섞지 않는다", () => {
  const first = createHistory();
  const second = createHistory();
  const pixels = [null, "#ff7a2f"];
  first.push(pixels);
  pixels[0] = "#ffffff";
  second.push(["#111111", null]);
  assert.deepEqual(first.undo(pixels), [null, "#ff7a2f"]);
  assert.equal(second.undoLen, 1);
  assert.deepEqual(first.redo([null, "#ff7a2f"]), pixels);
});

test("히스토리는 최대60개이며 새 스트로크가 redo를 비운다", () => {
  const history = createHistory();
  for (let i = 0; i < 75; i++) history.push([i]);
  assert.equal(history.undoLen, MAX_UNDO);
  assert.deepEqual(history.undo([75]), [74]);
  assert.equal(history.redoLen, 1);
  history.push([76]);
  assert.equal(history.redoLen, 0);
  history.reset();
  assert.equal(history.undoLen, 0);
  assert.equal(history.redoLen, 0);
});
