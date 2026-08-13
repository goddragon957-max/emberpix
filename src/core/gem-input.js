// 보석십자수 한 칸 입력 규칙.
// 브러시 크기와 무관하게 한 번의 유효한 탭은 정확히 한 칸만 채운다.

function cellIndex(pattern, pixels, size, x, y) {
  if (!Array.isArray(pattern) || !Array.isArray(pixels)) return -1;
  if (!Number.isInteger(size) || size <= 0) return -1;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= size || y >= size) return -1;
  const index = y * size + x;
  if (index >= pattern.length || index >= pixels.length) return -1;
  return index;
}

export function canApplyGemCell(pixels, pattern, size, x, y, filter = null) {
  const index = cellIndex(pattern, pixels, size, x, y);
  if (index < 0) return false;
  const target = pattern[index];
  if (!target || (filter && target !== filter)) return false;
  return pixels[index] !== target;
}

export function applyGemCell(pixels, pattern, size, x, y, filter = null) {
  if (!canApplyGemCell(pixels, pattern, size, x, y, filter)) return false;
  const index = y * size + x;
  pixels[index] = pattern[index];
  return true;
}
