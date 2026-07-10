// localStorage 자동 저장/복구. 저장 내용: size + 픽셀 배열 + 커스텀 색.
// 손상되었거나 형식이 맞지 않으면 무시(null) → 앱은 새 캔버스로 시작.

const KEY = "emberpix:autosave:v1";
const VALID_SIZES = [16, 32, 64];

export function saveState({ size, pixels, color }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ size, pixels, color }));
  } catch {
    // 용량 초과/프라이빗 모드 등 — 조용히 무시.
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return isValid(data) ? data : null;
  } catch {
    return null;
  }
}

function isValid(data) {
  if (!data || typeof data !== "object") return false;
  if (!VALID_SIZES.includes(data.size)) return false;
  if (!Array.isArray(data.pixels)) return false;
  if (data.pixels.length !== data.size * data.size) return false;
  // 각 셀은 null 또는 색 문자열.
  for (const c of data.pixels) {
    if (c !== null && typeof c !== "string") return false;
  }
  return true;
}
