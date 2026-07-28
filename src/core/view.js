// 캔버스 뷰(확대/이동) 순수 로직.
// view = { scale, tx, ty } — tx/ty는 CSS px 평행이동, transform-origin은 좌상단(0,0).
// 표시는 CSS transform이 담당하므로 픽셀 데이터·렌더러는 뷰를 알 필요가 없다.
// (셀 좌표 계산은 getBoundingClientRect가 transform을 반영하므로 기존 비율식 그대로 유효)

export const MIN_SCALE = 1;   // 1× = 화면 맞춤. 그보다 작게 줄일 이유가 없다.
export const MAX_SCALE = 16;
export const FIT_VIEW = { scale: 1, tx: 0, ty: 0 };

const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

// 확대된 캔버스가 항상 뷰포트를 덮도록 이동량을 제한 (여백이 생기지 않음).
// wrap: 정사각 뷰포트 한 변의 CSS px 길이.
export function clampView(view, wrap) {
  const scale = clampScale(view.scale);
  const min = wrap - wrap * scale; // scale>1이면 음수, scale=1이면 0
  const fix = (v) => Math.min(0, Math.max(min, Number.isFinite(v) ? v : 0));
  return { scale, tx: fix(view.tx), ty: fix(view.ty) };
}

// (ax, ay)를 화면상 고정점으로 삼아 targetScale로 확대/축소.
function anchorZoom(view, targetScale, ax, ay) {
  const scale = clampScale(targetScale);
  const k = scale / view.scale;
  return { scale, tx: ax - (ax - view.tx) * k, ty: ay - (ay - view.ty) * k };
}

// 휠/버튼 확대: 커서(ax, ay) 기준. 좌표는 뷰포트 좌상단 기준 CSS px.
export function zoomAt(view, targetScale, ax, ay, wrap) {
  return clampView(anchorZoom(view, targetScale, ax, ay), wrap);
}

export function zoomBy(view, factor, ax, ay, wrap) {
  return zoomAt(view, view.scale * factor, ax, ay, wrap);
}

// 두 손가락 제스처: 시작 스냅샷(start)과 현재 상태로 새 뷰를 만든다.
// start = { view, dist, mid:{x,y} } — 손가락 사이 거리 비율로 배율, 중점 이동량으로 팬.
export function pinchView(start, curDist, curMid, wrap) {
  const target = start.dist > 0 ? start.view.scale * (curDist / start.dist) : start.view.scale;
  const z = anchorZoom(start.view, target, start.mid.x, start.mid.y);
  return clampView(
    { scale: z.scale, tx: z.tx + (curMid.x - start.mid.x), ty: z.ty + (curMid.y - start.mid.y) },
    wrap
  );
}

// 포인터 두 개의 거리/중점 (좌표는 뷰포트 기준 CSS px).
export function pointerSpan(a, b) {
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y),
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

export function cssTransform(view) {
  return `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
}
