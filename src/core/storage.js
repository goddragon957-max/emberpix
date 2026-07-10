// localStorage 자동 저장/복구.
// v2 포맷: { version:2, size, frames:[픽셀배열...], currentFrame, color }.
// v1 포맷({ size, pixels, color })은 프레임 1개로 마이그레이션한다.
// 손상/형식 불일치는 무시(null) → 앱은 새 캔버스로 시작.

const KEY_V2 = "emberpix:autosave:v2";
const KEY_V1 = "emberpix:autosave:v1";
const VALID_SIZES = [16, 32, 64];

export function saveState({ size, frames, currentFrame, color }) {
  try {
    localStorage.setItem(
      KEY_V2,
      JSON.stringify({ version: 2, size, frames, currentFrame, color })
    );
  } catch {
    // 용량 초과/프라이빗 모드 등 — 조용히 무시.
  }
}

// 반환: { size, frames, currentFrame, color } 또는 null.
export function loadState() {
  const v2 = readV2();
  if (v2) return v2;
  const v1 = readV1();
  if (v1) return { size: v1.size, frames: [v1.pixels], currentFrame: 0, color: v1.color };
  return null;
}

function readV2() {
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (!raw) return null;
    const d = JSON.parse(raw);
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
      color: typeof d.color === "string" ? d.color : "#ef7d57",
    };
  } catch {
    return null;
  }
}

function readV1() {
  try {
    const raw = localStorage.getItem(KEY_V1);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    if (!VALID_SIZES.includes(d.size)) return null;
    if (!isValidFrame(d.pixels, d.size)) return null;
    return { size: d.size, pixels: d.pixels, color: typeof d.color === "string" ? d.color : "#ef7d57" };
  } catch {
    return null;
  }
}

function isValidFrame(px, size) {
  if (!Array.isArray(px)) return false;
  if (px.length !== size * size) return false;
  for (const c of px) {
    if (c !== null && typeof c !== "string") return false;
  }
  return true;
}
