// 도형 도구 순수 로직. 모두 셀 좌표 목록 [[x,y], ...]을 반환한다.
// 캔버스 밖 좌표도 그대로 반환하므로, 찍을 때 호출부가 경계를 확인한다
// (선택 도구의 stampPixels와 같은 정책 — 순수 함수는 size를 모른다).

// 브레젠험 직선 — 정수 연산만, 대각선도 끊김 없이 이어진다.
// 비정상 좌표(NaN/Infinity)는 종료 조건에 도달하지 못해 무한 루프가 되므로 먼저 막는다.
export function linePoints(x0, y0, x1, y1) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) return [];
  const pts = [];
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return pts;
}

// 사각형. filled=false면 테두리만(1px), true면 내부까지.
export function rectPoints(x0, y0, x1, y1, filled = false) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) return [];
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const pts = [];
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      const edge = x === xa || x === xb || y === ya || y === yb;
      if (filled || edge) pts.push([x, y]);
    }
  }
  return pts;
}

// 타원(드래그 사각형에 내접). 중점 알고리즘 대신 셀 단위 판정 —
// 반지름이 작은 픽셀아트에서 모양이 더 고르고, filled 처리가 단순하다.
export function ellipsePoints(x0, y0, x1, y1, filled = false) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) return [];
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const w = xb - xa + 1, h = yb - ya + 1;
  const cx = (xa + xb) / 2, cy = (ya + yb) / 2;
  const rx = w / 2, ry = h / 2;
  const inside = (x, y) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0;

  const pts = [];
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      if (!inside(x, y)) continue;
      if (filled) { pts.push([x, y]); continue; }
      // 테두리: 인접 4방향 중 하나라도 타원 밖이면 경계 셀.
      const edge =
        !inside(x + 1, y) || !inside(x - 1, y) ||
        !inside(x, y + 1) || !inside(x, y - 1);
      if (edge) pts.push([x, y]);
    }
  }
  return pts;
}

// 브러시(정사각 n×n)를 셀 목록에 적용해 확장. n=1이면 그대로.
// 중심 기준으로 좌상단으로 치우치게 확장한다(픽셀아트 브러시 관례).
export function expandBrush(points, n) {
  if (n <= 1) return points;
  const off = Math.floor((n - 1) / 2);
  const seen = new Set();
  const out = [];
  for (const [x, y] of points) {
    for (let dy = 0; dy < n; dy++) {
      for (let dx = 0; dx < n; dx++) {
        const px = x - off + dx, py = y - off + dy;
        const k = `${px},${py}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push([px, py]);
      }
    }
  }
  return out;
}

// 전역 색 교체: from과 같은 색인 모든 셀을 to로. 원본 불변.
// from이 null(빈 칸)이면 아무것도 하지 않는다 — 투명 전체를 칠하는 사고 방지.
export function replaceColor(pixels, from, to) {
  if (from === null || from === to) return pixels;
  const out = pixels.slice();
  for (let i = 0; i < out.length; i++) {
    if (out[i] === from) out[i] = to;
  }
  return out;
}
