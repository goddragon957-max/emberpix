// 보석십자수 사용자 도안 보관함.
// 원본 사진 대신 생성된 셀별 도안과 작은 미리보기만 저장해
// 기기 저장 공간과 개인정보 노출을 줄인다.

import { VALID_SIZES, isValidFrame } from "./format.js";

export const PATTERN_LIBRARY_KEY = "emberpix:pattern-library:v1";
export const PATTERN_LIBRARY_LIMIT = 20;
const NAME_LIMIT = 40;

function getStorage(storage) {
  if (storage) return storage;
  return typeof localStorage === "undefined" ? null : localStorage;
}

function normalizeId(id) {
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function normalizeName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return (trimmed || "이름 없는 도안").slice(0, NAME_LIMIT);
}

function normalizeItem(item, now) {
  if (!item || typeof item !== "object") return null;
  const id = normalizeId(item.id);
  const size = VALID_SIZES.includes(item.size) ? item.size : null;
  const pattern = size && isValidFrame(item.pattern, size) ? item.pattern : null;
  const thumb = typeof item.thumb === "string" && item.thumb.startsWith("data:image/png;base64,")
    ? item.thumb
    : null;
  if (!id || !pattern || !thumb) return null;
  return {
    id,
    name: normalizeName(item.name),
    size,
    pattern,
    thumb,
    updatedAt: Number.isFinite(item.updatedAt) ? Math.floor(item.updatedAt) : now,
  };
}

function readItems(storage) {
  const target = getStorage(storage);
  if (!target || typeof target.getItem !== "function") return { ok: false, reason: "unavailable" };
  try {
    const raw = target.getItem(PATTERN_LIBRARY_KEY);
    if (!raw) return { ok: true, items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return { ok: true, items: [] };
    const seen = new Set();
    const items = parsed.items
      .map((item) => normalizeItem(item, 0))
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name))
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    return { ok: true, items: items.slice(0, PATTERN_LIBRARY_LIMIT) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

function writeItems(storage, items) {
  const target = getStorage(storage);
  if (!target || typeof target.setItem !== "function") return { ok: false, reason: "unavailable" };
  try {
    target.setItem(PATTERN_LIBRARY_KEY, JSON.stringify({ version: 1, items }));
    return { ok: true };
  } catch (error) {
    const quota = error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
    return { ok: false, reason: quota ? "quota" : "unavailable" };
  }
}

export function listPatternItems(storage, size = null) {
  const result = readItems(storage);
  if (!result.ok) return [];
  return size == null ? result.items : result.items.filter((item) => item.size === size);
}

export function savePatternItem(item, storage, now = Date.now()) {
  const candidate = normalizeItem({ ...item, updatedAt: now }, now);
  if (!candidate) return { ok: false, reason: "invalid" };
  const current = readItems(storage);
  if (!current.ok) return current;
  const index = current.items.findIndex((saved) => saved.id === candidate.id);
  if (index < 0 && current.items.length >= PATTERN_LIBRARY_LIMIT) {
    return { ok: false, reason: "limit" };
  }
  const next = [...current.items];
  if (index < 0) next.push(candidate);
  else next[index] = candidate;
  next.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
  const written = writeItems(storage, next);
  return written.ok ? { ok: true, item: candidate } : written;
}

export function deletePatternItem(id, storage) {
  const itemId = normalizeId(id);
  if (!itemId) return { ok: false, reason: "invalid" };
  const current = readItems(storage);
  if (!current.ok) return current;
  const next = current.items.filter((item) => item.id !== itemId);
  if (next.length === current.items.length) return { ok: true, removed: false };
  const target = getStorage(storage);
  try {
    if (next.length === 0) target.removeItem(PATTERN_LIBRARY_KEY);
    else target.setItem(PATTERN_LIBRARY_KEY, JSON.stringify({ version: 1, items: next }));
    return { ok: true, removed: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function createPatternId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pattern-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
