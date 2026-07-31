// 저장 데이터 공통 형식 검증 — 자동 저장(storage)과 .emberpix 파일(project)이 공유.
// 필드: { size, frames, currentFrame, color, reference, refOpacity, pattern, palettes }
//   pattern: 보석십자수 목표색 배열(hex|null) 또는 null — 선택 필드.
//   palettes: 팔레트 슬롯 상태 { user, active, recent } — 선택 필드(없으면 기본값).

import { normalizePaletteState } from "./palettes.js";

export const VALID_SIZES = [16, 32, 64];
export const FALLBACK_COLOR = "#ef7d57";

export function isValidFrame(px, size) {
  if (!Array.isArray(px)) return false;
  if (px.length !== size * size) return false;
  for (const c of px) {
    if (c !== null && typeof c !== "string") return false;
  }
  return true;
}

// 참조 이미지: 셀당 0~255 정수 또는 null.
export function isValidReference(ref, size) {
  if (!Array.isArray(ref)) return false;
  if (ref.length !== size * size) return false;
  for (const v of ref) {
    if (v !== null && !(Number.isInteger(v) && v >= 0 && v <= 255)) return false;
  }
  return true;
}

// 공통 필드 검증·보정. 형식 불일치는 null.
export function normalizeStateData(d) {
  if (!d || typeof d !== "object") return null;
  if (!VALID_SIZES.includes(d.size)) return null;
  if (!Array.isArray(d.frames) || d.frames.length === 0) return null;
  for (const f of d.frames) {
    if (!isValidFrame(f, d.size)) return null;
  }
  const cf = Number.isInteger(d.currentFrame) ? d.currentFrame : 0;
  return {
    size: d.size,
    frames: d.frames,
    currentFrame: Math.max(0, Math.min(cf, d.frames.length - 1)),
    color: typeof d.color === "string" ? d.color : FALLBACK_COLOR,
    reference: isValidReference(d.reference, d.size) ? d.reference : null,
    refOpacity:
      typeof d.refOpacity === "number" && d.refOpacity >= 0.1 && d.refOpacity <= 1
        ? d.refOpacity
        : 1,
    // 도안은 프레임과 동일한 셀 형식(hex|null). 형식 불일치면 null.
    pattern: isValidFrame(d.pattern, d.size) ? d.pattern : null,
    // 팔레트는 크기와 무관 — 없거나 손상되면 기본값(내장 팔레트만).
    palettes: normalizePaletteState(d.palettes),
  };
}
