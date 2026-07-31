// 팔레트 관리 순수 로직 (슬롯 저장/전환/삭제 + 최근 사용 색).
//
// state = { user: [{ name, colors: [hex...] }...], active: number, recent: [hex...] }
//   - 내장 Sweetie 16은 저장하지 않고 런타임에 항상 0번으로 붙인다(allPalettes).
//     → 내장 팔레트가 파일에 복제되지 않고, 실수로 지워질 일도 없다.
//   - active는 allPalettes() 기준 인덱스. 0 = 내장(읽기 전용), 1.. = user[active-1].
//   - 모든 변경 함수는 새 state를 반환하고, 변화가 없으면 **같은 참조**를 돌려준다
//     (React setState에서 불필요한 리렌더를 막기 위함).

export const SWEETIE16 = [
  "#1a1c2c", "#5d275d", "#b13e53", "#ef7d57",
  "#ffcd75", "#a7f070", "#38b764", "#257179",
  "#29366f", "#3b5dc9", "#41a6f6", "#73eff7",
  "#f4f4f4", "#94b0c2", "#566c86", "#333c57",
];

export const BUILTIN_PALETTE = { name: "Sweetie 16", colors: SWEETIE16, builtin: true };

export const MAX_RECENT = 12;
export const MAX_PALETTES = 12; // 사용자 팔레트 개수 상한 (내장 제외)
export const MAX_COLORS = 64;   // 팔레트 하나의 색 개수 상한
export const MAX_NAME = 20;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const isHex = (s) => typeof s === "string" && HEX_RE.test(s);

// 유효한 hex만 소문자로. 아니면 null.
export function normHex(s) {
  return isHex(s) ? s.toLowerCase() : null;
}

// 유효한 색만 남기고 중복 제거(앞선 것 우선).
export function uniqueHex(list) {
  const out = [];
  const seen = new Set();
  if (!Array.isArray(list)) return out;
  for (const c of list) {
    const h = normHex(c);
    if (!h || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

function cleanName(name, fallback = "내 팔레트") {
  const s = typeof name === "string" ? name.trim() : "";
  return (s || fallback).slice(0, MAX_NAME);
}

export function defaultPaletteState() {
  return { user: [], active: 0, recent: [] };
}

// active를 유효 범위로 클램프한 값 (state는 건드리지 않는다).
function activeIndex(state) {
  const max = state.user.length;
  const i = Number.isInteger(state.active) ? state.active : 0;
  return Math.max(0, Math.min(i, max));
}

// 내장 + 사용자 팔레트 전체 목록.
export function allPalettes(state) {
  return [BUILTIN_PALETTE, ...state.user];
}

export function activePaletteIndex(state) {
  return activeIndex(state);
}

export function activePalette(state) {
  return allPalettes(state)[activeIndex(state)];
}

export function activeColors(state) {
  return activePalette(state).colors;
}

// 편집(색 추가/삭제·이름 변경·삭제) 가능 여부 — 내장은 불가.
export function isEditable(state) {
  return activeIndex(state) > 0;
}

export function setActivePalette(state, i) {
  if (!Number.isInteger(i) || i < 0 || i > state.user.length) return state;
  if (i === activeIndex(state)) return state;
  return { ...state, active: i };
}

// 새 팔레트 추가 → 방금 만든 팔레트를 활성화한다. 색이 하나도 없으면 무시.
export function addPalette(state, name, colors) {
  if (state.user.length >= MAX_PALETTES) return state;
  const list = uniqueHex(colors).slice(0, MAX_COLORS);
  if (!list.length) return state;
  const user = [...state.user, { name: cleanName(name), colors: list }];
  return { ...state, user, active: user.length };
}

// 활성 팔레트 복제(내장 포함) — 내장을 손보고 싶을 때의 경로.
export function duplicateActivePalette(state) {
  const p = activePalette(state);
  return addPalette(state, `${p.name} 복사`, p.colors);
}

// i는 allPalettes 기준. 0(내장)은 삭제할 수 없다.
export function removePalette(state, i) {
  if (!Number.isInteger(i) || i < 1 || i > state.user.length) return state;
  const user = state.user.filter((_, k) => k !== i - 1);
  const cur = activeIndex(state);
  const active = cur === i ? 0 : cur > i ? cur - 1 : cur;
  return { ...state, user, active };
}

export function renamePalette(state, i, name) {
  if (!Number.isInteger(i) || i < 1 || i > state.user.length) return state;
  const cur = state.user[i - 1];
  const next = cleanName(name, cur.name);
  if (next === cur.name) return state;
  const user = state.user.map((p, k) => (k === i - 1 ? { ...p, colors: p.colors, name: next } : p));
  return { ...state, user };
}

function mapActive(state, fn) {
  const i = activeIndex(state);
  if (i === 0) return state; // 내장은 편집 불가
  const cur = state.user[i - 1];
  const colors = fn(cur.colors);
  if (!colors || colors === cur.colors) return state;
  const user = state.user.map((p, k) => (k === i - 1 ? { ...p, colors } : p));
  return { ...state, user };
}

// 활성(사용자) 팔레트에 색 추가. 중복/상한 초과/내장이면 그대로.
export function addColorToActive(state, hex) {
  const h = normHex(hex);
  if (!h) return state;
  return mapActive(state, (colors) =>
    colors.includes(h) || colors.length >= MAX_COLORS ? colors : [...colors, h]
  );
}

export function removeColorFromActive(state, hex) {
  const h = normHex(hex);
  if (!h) return state;
  return mapActive(state, (colors) =>
    colors.includes(h) ? colors.filter((c) => c !== h) : colors
  );
}

// 최근 사용 색: 맨 앞으로 이동 + 중복 제거 + MAX_RECENT개 유지.
// 이미 맨 앞이면 같은 참조를 반환한다(스트로크마다 호출해도 리렌더 없음).
export function pushRecentColor(state, hex) {
  const h = normHex(hex);
  if (!h) return state;
  const recent = Array.isArray(state.recent) ? state.recent : [];
  if (recent[0] === h) return state;
  return { ...state, recent: [h, ...recent.filter((c) => c !== h)].slice(0, MAX_RECENT) };
}

// ---------- 저장 포맷 검증 ----------

function cleanPalette(p) {
  if (!p || typeof p !== "object") return null;
  const colors = uniqueHex(p.colors).slice(0, MAX_COLORS);
  if (!colors.length) return null;
  return { name: cleanName(p.name), colors };
}

// 손상/형식 불일치는 조용히 기본값으로 — 팔레트 때문에 그림을 못 여는 일은 없어야 한다.
export function normalizePaletteState(d) {
  if (!d || typeof d !== "object") return defaultPaletteState();
  const user = Array.isArray(d.user)
    ? d.user.map(cleanPalette).filter(Boolean).slice(0, MAX_PALETTES)
    : [];
  const active = Number.isInteger(d.active) ? Math.max(0, Math.min(d.active, user.length)) : 0;
  const recent = uniqueHex(d.recent).slice(0, MAX_RECENT);
  return { user, active, recent };
}

// 구 포맷 하위호환: .emberpix v1의 단일 `palette` 배열.
// 내장과 같은 색 목록이면 버리고(중복 슬롯 방지), 다르면 사용자 팔레트로 받아들인다.
export function paletteStateFromLegacy(palette) {
  const colors = uniqueHex(palette);
  if (!colors.length) return defaultPaletteState();
  const same =
    colors.length === SWEETIE16.length && colors.every((c, i) => c === SWEETIE16[i]);
  if (same) return defaultPaletteState();
  return addPalette(defaultPaletteState(), "불러온 팔레트", colors);
}
