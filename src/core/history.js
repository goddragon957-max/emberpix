// 스냅샷 기반 undo/redo 스택 (최대 60 — AGENTS.md).
// push 시 현재 픽셀 배열을 복제해 저장하고 redo 스택을 비운다.

export const MAX_UNDO = 60;

export function createHistory() {
  let undoStack = [];
  let redoStack = [];

  return {
    // 새 스트로크 시작 시 1회 호출. 스냅샷 복제 후 redo 무효화.
    push(pixels) {
      undoStack.push(pixels.slice());
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack = [];
    },
    // current(현재 픽셀)를 redo로 넘기고 직전 스냅샷을 반환. 없으면 null.
    undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(current);
      return undoStack.pop();
    },
    // current를 undo로 넘기고 다음 스냅샷을 반환. 없으면 null.
    redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(current);
      return redoStack.pop();
    },
    // 캔버스 크기 변경 시 히스토리 초기화 (SKILL.md).
    reset() {
      undoStack = [];
      redoStack = [];
    },
    get undoLen() {
      return undoStack.length;
    },
    get redoLen() {
      return redoStack.length;
    },
  };
}
