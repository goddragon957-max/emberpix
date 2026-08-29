// localStorage 자동 저장/복구.
// v2 포맷: { version:2, size, frames:[픽셀배열...], currentFrame, color, reference, palettes }.
//   reference는 색칠공부 흑백 밝기 배열(0~255|null) 또는 null — 선택 필드.
//   palettes는 팔레트 슬롯 상태 — 선택 필드(없으면 내장 팔레트만).
// v1 포맷({ size, pixels, color })은 프레임 1개로 마이그레이션한다.
// 손상/형식 불일치는 무시(null) → 앱은 새 캔버스로 시작.
// 필드 검증은 format.js 공유 로직 사용 (.emberpix 파일과 동일 기준).

import { VALID_SIZES, FALLBACK_COLOR, isValidFrame, normalizeStateData } from "./format.js";

const KEY_V2 = "emberpix:autosave:v2";
const KEY_V1 = "emberpix:autosave:v1";

function getStorage(storage) {
  try {
    if (storage !== undefined) return storage;
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // 저장 API뿐 아니라 storage 속성 접근 자체도 브라우저 정책으로 거부될 수 있다.
    return null;
  }
}

function isQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
}

export function saveState({ size, frames, currentFrame, color, reference, refOpacity, pattern, palettes, mode }, storage) {
  const target = getStorage(storage);
  if (!target || typeof target.setItem !== "function") return { ok: false, reason: "unavailable" };

  const data = normalizeStateData({
    size,
    frames,
    currentFrame,
    color,
    reference,
    refOpacity,
    pattern,
    palettes,
    mode,
  });
  if (!data) return { ok: false, reason: "invalid" };

  try {
    target.setItem(
      KEY_V2,
      JSON.stringify({
        version: 2,
        size: data.size,
        frames: data.frames,
        currentFrame: data.currentFrame,
        color: data.color,
        reference: data.reference,
        refOpacity: data.refOpacity,
        pattern: data.pattern,
        palettes: data.palettes,
        mode: data.mode,
      })
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
  }
}

// 반환: { size, frames, currentFrame, color, reference, refOpacity } 또는 null.
export function loadState(storage) {
  const v2 = readV2(storage);
  if (v2) return v2;
  const v1 = readV1(storage);
  if (v1) return { size: v1.size, frames: [v1.pixels], currentFrame: 0, color: v1.color, reference: null };
  return null;
}

function readV2(storage) {
  const target = getStorage(storage);
  if (!target || typeof target.getItem !== "function") return null;
  try {
    const raw = target.getItem(KEY_V2);
    if (!raw) return null;
    return normalizeStateData(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readV1(storage) {
  const target = getStorage(storage);
  if (!target || typeof target.getItem !== "function") return null;
  try {
    const raw = target.getItem(KEY_V1);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    if (!VALID_SIZES.includes(d.size)) return null;
    if (!isValidFrame(d.pixels, d.size)) return null;
    return { size: d.size, pixels: d.pixels, color: typeof d.color === "string" ? d.color : FALLBACK_COLOR };
  } catch {
    return null;
  }
}
