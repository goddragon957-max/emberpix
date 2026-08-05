// 모드 정의 — 시작 화면에서 고른 모드가 화면 구성과 쓸 수 있는 도구를 정한다.
//
// 아이들이 쓰는 앱이라 "보이는 것 = 지금 쓸 수 있는 것"이 되어야 한다.
// 보석십자수 모드는 펜 하나로 고정하고(지우개도 없음 — 실수로 지우는 사고 방지),
// 되돌리기만 남긴다. 고급 기능은 모드와 상관없이 "더보기" 서랍에 모아둔다.

export const MODE_DRAW = "draw";
export const MODE_GEM = "gem";

export const MODES = {
  [MODE_DRAW]: {
    id: MODE_DRAW,
    name: "그림 그리기",
    desc: "펜으로 자유롭게 도트를 찍어요",
    icon: "pen",
    // 하단 큰 버튼으로 내보내는 도구 (나머지는 서랍의 "도구 더보기"에)
    quickTools: ["pen", "eraser", "fill", "picker"],
    // 이 모드에서 허용되는 도구 전체
    tools: ["pen", "eraser", "fill", "picker", "line", "rect", "ellipse", "replace", "select"],
    gem: false,
  },
  [MODE_GEM]: {
    id: MODE_GEM,
    name: "보석십자수",
    desc: "도안 위를 톡톡 눌러 보석을 채워요",
    icon: "gem",
    quickTools: [],          // 도구 줄 없음 — 펜 고정
    tools: ["pen"],
    gem: true,
  },
};

export const MODE_LIST = [MODES[MODE_DRAW], MODES[MODE_GEM]];

export const isModeId = (id) => id === MODE_DRAW || id === MODE_GEM;

// 저장된 값 → 유효한 모드 id. 없으면 도안 유무로 추측한다(구 저장본 호환).
export function modeFromSaved(saved, hasPattern) {
  if (isModeId(saved)) return saved;
  return hasPattern ? MODE_GEM : MODE_DRAW;
}

// 모드가 이 도구를 쓸 수 있나. 못 쓰면 호출부가 펜으로 되돌린다.
export function allowsTool(modeId, tool) {
  const m = MODES[modeId];
  return !m || m.tools.includes(tool);
}
