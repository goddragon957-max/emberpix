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
// barrier: 색칠공부 참조 배열(밝기 0~255|null). 어두운 선(<128)은 벽으로
// 취급해 채우기가 도안 선을 넘지 않는다. null이면 경계 없음.
export function floodFill(pixels, size, sx, sy, newColor, barrier = null) {
  const isWall = (i) => barrier !== null && barrier[i] !== null && barrier[i] < 128;
  const start = sy * size + sx;
  if (isWall(start)) return pixels;
  const target = pixels[start];
  if (target === newColor) return pixels;
  const out = pixels.slice();
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const i = y * size + x;
    if (out[i] !== target || isWall(i)) continue;
    out[i] = newColor;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}
