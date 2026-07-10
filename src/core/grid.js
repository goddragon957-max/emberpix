// 픽셀 그리드 데이터 + 좌표/인덱스 유틸.
// 좌표계는 (x, y), 인덱스는 y * size + x 로 통일 (AGENTS.md).

export function makeGrid(size) {
  return new Array(size * size).fill(null);
}

export function idx(x, y, size) {
  return y * size + x;
}

export function inBounds(x, y, size) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

// 스택 기반 플러드필 (재귀 금지 — SKILL.md).
export function floodFill(pixels, size, sx, sy, newColor) {
  const target = pixels[sy * size + sx];
  if (target === newColor) return pixels;
  const out = pixels.slice();
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const i = y * size + x;
    if (out[i] !== target) continue;
    out[i] = newColor;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}
