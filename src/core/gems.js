// 보석십자수 도안 로직 — 사진→컬러 도안 생성, 색 범례(총/남은), 진행 상황.
// 도안(pattern)은 프레임 픽셀과 같은 형식: 셀당 목표색 hex | null(배경).
// 색 매칭/양자화는 M11의 quantize.js를 그대로 재사용한다.

import {
  histogramFromImageData, medianCut, nearestColor, paletteRgb, hexToRgb, colorDistance,
} from "./quantize.js";
import { sampleGrid } from "./reference.js";

// 도안 색 개수 후보 — 너무 많으면 실제 보석십자수처럼 "한 색씩" 진행하기 힘들다.
export const PATTERN_COLORS = [6, 8, 12, 16, 24];

// 눈으로 구분되지 않는 색을 합치는 임계값(가중 제곱거리 ≈ 채널당 13 차이).
// 다운샘플 경계에서 생기는 미묘한 중간색들이 별도 "색"으로 잡히면
// 한 색씩 놓는 재미가 사라지므로, 도안에서는 이런 색을 큰 색에 흡수시킨다.
export const MERGE_DIST = 1800;

// 색별 셀 수가 많은 것부터 대표로 남기고, 가까운 색은 그쪽으로 흡수시키는 매핑.
function mergeMap(counts, minDist) {
  const order = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
  );
  const keep = [];
  const remap = new Map();
  for (const [hex] of order) {
    const c = hexToRgb(hex);
    if (!c) continue;
    const near = keep.find((k) => colorDistance(c, k) < minDist);
    if (near) remap.set(hex, near[3]);
    else { keep.push([c[0], c[1], c[2], hex]); remap.set(hex, hex); }
  }
  return remap;
}

// 이미 다운샘플된 격자 RGBA → 도안 배열. size*size 길이, 투명 셀은 null.
// 대표색을 격자 자체에서 뽑기 때문에 팔레트의 모든 색이 도안에 실제로 등장한다.
export function gridToPattern(data, size, colorCount = 12, alphaMin = 32, minDist = MERGE_DIST) {
  const out = new Array(size * size).fill(null);
  if (!data || data.length < size * size * 4) return out;

  const palette = medianCut(histogramFromImageData(data, alphaMin), colorCount);
  if (!palette.length) return out;
  const rgb = paletteRgb(palette);

  const counts = new Map();
  for (let i = 0; i < size * size; i++) {
    if (data[i * 4 + 3] < alphaMin) continue; // 투명/레터박스 = 배경
    const hex = nearestColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], rgb);
    out[i] = hex;
    counts.set(hex, (counts.get(hex) || 0) + 1);
  }

  if (minDist > 0 && counts.size > 1) {
    const remap = mergeMap(counts, minDist);
    for (let i = 0; i < out.length; i++) {
      if (out[i]) out[i] = remap.get(out[i]) ?? out[i];
    }
  }
  return out;
}

// 이미지 → 컬러 도안 (비율 유지 다운샘플 + 양자화). 브라우저 전용.
export function imageToPattern(img, size, colorCount = 12) {
  return gridToPattern(sampleGrid(img, size), size, colorCount);
}

// 도안에 쓰인 색 목록 + 색별 총/남은 개수.
// pixels가 없으면 done은 0. 개수 많은 색 우선, 동수면 hex 순(결정론).
export function patternLegend(pattern, pixels) {
  if (!Array.isArray(pattern)) return [];
  const map = new Map();
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (!c) continue;
    let e = map.get(c);
    if (!e) { e = { color: c, total: 0, done: 0 }; map.set(c, e); }
    e.total++;
    if (pixels && pixels[i] === c) e.done++;
  }
  return [...map.values()].sort(
    (a, b) => b.total - a.total || (a.color < b.color ? -1 : a.color > b.color ? 1 : 0)
  );
}

// 전체 진행률. 도안이 없으면 null.
export function patternProgress(pattern, pixels) {
  if (!Array.isArray(pattern)) return null;
  let total = 0, done = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (!pattern[i]) continue;
    total++;
    if (pixels && pixels[i] === pattern[i]) done++;
  }
  return { total, done };
}

// 아직 안 끝난 색 중 개수가 가장 많은 색 (다음에 놓을 색 추천). 없으면 null.
export function nextUnfinishedColor(legend) {
  for (const e of legend) {
    if (e.done < e.total) return e.color;
  }
  return null;
}
