// 작품 보관함(localStorage) CRUD.
// 자동 저장 슬롯(storage.js)과 분리해, 아이가 골라 저장한 작품만 이 키에 남긴다.

import { normalizeStateData } from "./format.js";

export const LIBRARY_KEY = "emberpix:library:v1";
export const LIBRARY_LIMIT = 20;

const NAME_LIMIT = 40;

function getStorage(storage) {
  if (storage) return storage;
  return typeof localStorage === "undefined" ? null : localStorage;
}

function isQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
}

function normalizeName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return (trimmed || "이름 없는 작품").slice(0, NAME_LIMIT);
}

function normalizeId(id) {
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function normalizeItem(item, now) {
  if (!item || typeof item !== "object") return null;
  const id = normalizeId(item.id);
  const data = normalizeStateData(item.data);
  // 미리보기는 canvas.toDataURL("image/png")로 만든 작은 PNG만 허용한다.
  const thumb = typeof item.thumb === "string" && item.thumb.startsWith("data:image/png;base64,")
    ? item.thumb
    : null;
  if (!id || !data || !thumb) return null;

  return {
    id,
    name: normalizeName(item.name),
    mode: data.mode,
    size: data.size,
    updatedAt: Number.isFinite(item.updatedAt) ? Math.floor(item.updatedAt) : now,
    thumb,
    // data는 .emberpix와 같은 상태 필드(size, frames, palettes 등)를 그대로 보관한다.
    data,
  };
}

function sortNewestFirst(items) {
  return items.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

function readItems(storage) {
  const target = getStorage(storage);
  if (!target || typeof target.getItem !== "function") return { ok: false, reason: "unavailable" };

  try {
    const raw = target.getItem(LIBRARY_KEY);
    if (!raw) return { ok: true, items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return { ok: true, items: [] };

    const seen = new Set();
    const items = sortNewestFirst(
      parsed.items
        .map((item) => normalizeItem(item, 0))
        .filter(Boolean)
    ).filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return { ok: true, items: items.slice(0, LIBRARY_LIMIT) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

function writeItems(storage, items) {
  const target = getStorage(storage);
  if (!target || typeof target.setItem !== "function") return { ok: false, reason: "unavailable" };

  try {
    target.setItem(LIBRARY_KEY, JSON.stringify({ version: 1, items }));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
  }
}

// 목록은 메타와 실제 상태를 함께 돌려준다. 최대 20개라 전체를 읽어도 충분히 가볍다.
export function listLibraryItems(storage) {
  const result = readItems(storage);
  return result.ok ? result.items : [];
}

export function loadLibraryItem(id, storage) {
  const itemId = normalizeId(id);
  if (!itemId) return null;
  return listLibraryItems(storage).find((item) => item.id === itemId) ?? null;
}

// 같은 id는 갱신, 새 id는 최대 20개까지만 추가한다.
// 쓰기 실패 시 메모리의 현재 작업은 전혀 바꾸지 않고 실패 결과만 돌려준다.
export function saveLibraryItem(item, storage, now = Date.now()) {
  // 사용자가 다시 저장한 시각을 항상 최신 시각으로 기록한다.
  const candidate = normalizeItem({ ...item, updatedAt: now }, now);
  if (!candidate) return { ok: false, reason: "invalid" };

  const current = readItems(storage);
  if (!current.ok) return current;
  const index = current.items.findIndex((saved) => saved.id === candidate.id);
  if (index < 0 && current.items.length >= LIBRARY_LIMIT) return { ok: false, reason: "limit" };

  const next = [...current.items];
  if (index < 0) next.push(candidate);
  else next[index] = candidate;
  sortNewestFirst(next);

  const written = writeItems(storage, next);
  return written.ok ? { ok: true, item: candidate } : written;
}

export function deleteLibraryItem(id, storage) {
  const itemId = normalizeId(id);
  if (!itemId) return { ok: false, reason: "invalid" };

  const current = readItems(storage);
  if (!current.ok) return current;
  const next = current.items.filter((item) => item.id !== itemId);
  if (next.length === current.items.length) return { ok: true, removed: false };

  const target = getStorage(storage);
  try {
    if (next.length === 0) target.removeItem(LIBRARY_KEY);
    else target.setItem(LIBRARY_KEY, JSON.stringify({ version: 1, items: next }));
    return { ok: true, removed: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
  }
}

export function createLibraryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
