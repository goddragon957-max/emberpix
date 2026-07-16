// .emberpix 프로젝트 파일 저장/불러오기.
// 포맷 v1: { app:"emberpix", version:1, size, frames, currentFrame, color, palette, reference, refOpacity }
//   자동 저장 v2 포맷과 같은 상태 필드에 app 태그와 palette 배열을 더한 것.
//   reference(색칠공부 밑그림)도 포함 — 불러오면 이어서 따라 그릴 수 있다.

import { normalizeStateData } from "./format.js";

const APP_TAG = "emberpix";
const FILE_VERSION = 1;

// 상태를 JSON 직렬화해 .emberpix 파일로 다운로드.
export function saveProjectFile({ size, frames, currentFrame, color, palette, reference, refOpacity }) {
  const data = {
    app: APP_TAG,
    version: FILE_VERSION,
    size,
    frames,
    currentFrame,
    color,
    palette,
    reference: reference ?? null,
    refOpacity: typeof refOpacity === "number" ? refOpacity : 1,
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
// palette는 문자열 배열일 때만 유지 — 현재 UI 팔레트는 고정이라 참고용으로만 보존.
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
  const palette =
    Array.isArray(d.palette) && d.palette.every((c) => typeof c === "string")
      ? d.palette
      : null;
  return { ...state, palette };
}
