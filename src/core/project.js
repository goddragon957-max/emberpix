// .emberpix 프로젝트 파일 저장/불러오기.
// 포맷 v2: { app:"emberpix", version:2, size, frames, currentFrame, color,
//           palettes, palette, reference, refOpacity, pattern }
//   자동 저장 v2 포맷과 같은 상태 필드에 app 태그와 팔레트를 더한 것.
//   reference(색칠공부 밑그림)도 포함 — 불러오면 이어서 따라 그릴 수 있다.
//   palettes = 다중 팔레트 슬롯 상태(v2 신규). palette = 활성 팔레트 색 배열로,
//   v1 파일 하위호환 + 다른 도구에서 읽기 쉬운 평면 형태로 함께 남긴다.

import { normalizeStateData } from "./format.js";
import { normalizePaletteState, paletteStateFromLegacy } from "./palettes.js";

const APP_TAG = "emberpix";
const FILE_VERSION = 2;

// 상태를 JSON 직렬화해 .emberpix 파일로 다운로드.
export function saveProjectFile({ size, frames, currentFrame, color, palette, palettes, reference, refOpacity, pattern }) {
  const data = {
    app: APP_TAG,
    version: FILE_VERSION,
    size,
    frames,
    currentFrame,
    color,
    palettes: palettes ?? null,
    palette,
    reference: reference ?? null,
    refOpacity: typeof refOpacity === "number" ? refOpacity : 1,
    pattern: pattern ?? null,
  };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `emberpix_${size}x${size}_${frames.length}f.emberpix`;
  a.click();
  URL.revokeObjectURL(url);
}

// JSON 텍스트 → 검증된 프로젝트 상태 또는 null(손상/형식 불일치).
// 팔레트는 palettes(v2)를 우선 쓰고, 없으면 v1의 평면 palette 배열을 슬롯으로 승격한다.
export function parseProject(text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    return null;
  }
  if (!d || typeof d !== "object" || d.app !== APP_TAG) return null;
  const state = normalizeStateData(d);
  if (!state) return null;
  const palettes = d.palettes
    ? normalizePaletteState(d.palettes)
    : paletteStateFromLegacy(d.palette);
  return { ...state, palettes };
}
