// 이미지 → 대표색 N개 추출 (미디언 컷) + 최근접 팔레트 색 매칭.
// M11 팔레트 추출과 M12 사진→도안 생성이 공유하는 핵심 유틸이므로
// 알고리즘은 전부 순수 함수로 두고, DOM(캔버스) 의존은 마지막 두 함수에만 둔다.

// ---------- hex ↔ rgb ----------

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// 유효한 #rrggbb 만 [r,g,b]로. 아니면 null.
export function hexToRgb(hex) {
  if (typeof hex !== "string" || !HEX_RE.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// 항상 소문자 #rrggbb. NaN/범위 밖은 0~255로 클램프한다.
export function rgbToHex(r, g, b) {
  const ch = (v) => {
    const n = Number.isFinite(v) ? Math.round(v) : 0;
    return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  };
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

// 지각 밝기(0~255). 팔레트 정렬용.
export function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ---------- 히스토그램 ----------

// RGBA 바이트 배열 → [{ r, g, b, count }]. 거의 투명한 픽셀은 제외.
// 결과를 (r,g,b)로 정렬해 입력이 같으면 출력도 같도록(결정론) 고정한다.
export function histogramFromImageData(data, alphaMin = 32) {
  const map = new Map();
  if (!data || typeof data.length !== "number") return [];
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < alphaMin) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = (r << 16) | (g << 8) | b;
    const e = map.get(key);
    if (e) e.count++;
    else map.set(key, { r, g, b, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.r - b.r || a.g - b.g || a.b - b.b);
}

// ---------- 미디언 컷 ----------

// 상자의 채널별 폭 중 가장 넓은 채널과 그 폭.
function widestChannel(box) {
  let lo = [255, 255, 255], hi = [0, 0, 0];
  for (const e of box) {
    const v = [e.r, e.g, e.b];
    for (let c = 0; c < 3; c++) {
      if (v[c] < lo[c]) lo[c] = v[c];
      if (v[c] > hi[c]) hi[c] = v[c];
    }
  }
  let ch = 0, range = hi[0] - lo[0];
  for (let c = 1; c < 3; c++) {
    if (hi[c] - lo[c] > range) { ch = c; range = hi[c] - lo[c]; }
  }
  return { ch, range };
}

const KEY = ["r", "g", "b"];

// 가장 넓은 채널로 정렬해 픽셀 수(count) 기준 중앙에서 두 상자로 나눈다.
// 양쪽이 반드시 1개 이상이 되도록 절단 위치를 [1, len-1]로 제한한다.
function splitBox(box) {
  if (box.length < 2) return null;
  const { ch } = widestChannel(box);
  const k = KEY[ch];
  // 동일 값 타이브레이크까지 고정 → 정렬 결과가 항상 같다.
  const sorted = [...box].sort((a, b) => a[k] - b[k] || a.r - b.r || a.g - b.g || a.b - b.b);
  const total = sorted.reduce((s, e) => s + e.count, 0);
  let acc = 0, cut = 0;
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i].count;
    if (acc * 2 >= total) { cut = i + 1; break; }
  }
  cut = Math.max(1, Math.min(sorted.length - 1, cut));
  return [sorted.slice(0, cut), sorted.slice(cut)];
}

// 상자의 픽셀 수 가중 평균색.
function averageHex(box) {
  let n = 0, r = 0, g = 0, b = 0;
  for (const e of box) {
    n += e.count;
    r += e.r * e.count;
    g += e.g * e.count;
    b += e.b * e.count;
  }
  if (n === 0) return rgbToHex(0, 0, 0);
  return rgbToHex(r / n, g / n, b / n);
}

// 히스토그램 → 대표색 hex 배열 (최대 n개, 밝은 순서가 아닌 어두운 → 밝은 순).
// 중복 평균색은 합쳐지므로 실제 개수는 n보다 적을 수 있다.
export function medianCut(entries, n) {
  const list = Array.isArray(entries) ? entries.filter((e) => e && e.count > 0) : [];
  const want = Number.isFinite(n) ? Math.floor(n) : 0;
  if (!list.length || want < 1) return [];
  const target = Math.min(want, list.length);

  let boxes = [list];
  while (boxes.length < target) {
    // 가장 색 폭이 넓은(쪼갤 여지가 큰) 상자를 고른다.
    let bi = -1, best = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const { range } = widestChannel(boxes[i]);
      if (range > best) { bi = i; best = range; }
    }
    if (bi < 0) break; // 더 쪼갤 상자가 없다
    const parts = splitBox(boxes[bi]);
    if (!parts) break;
    boxes.splice(bi, 1, parts[0], parts[1]);
  }

  const hexes = boxes.map(averageHex);
  const seen = new Set();
  const out = [];
  for (const h of hexes) {
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  // 밝기 순 정렬 — 팔레트 스트립이 보기 좋고, 출력 순서도 결정론적.
  return out.sort((a, b) => {
    const A = hexToRgb(a), B = hexToRgb(b);
    return luminance(...A) - luminance(...B) || (a < b ? -1 : a > b ? 1 : 0);
  });
}

// RGBA 바이트 배열 → 대표색 hex 배열.
export function extractPaletteFromImageData(data, n = 16, alphaMin = 32) {
  return medianCut(histogramFromImageData(data, alphaMin), n);
}

// ---------- 최근접 색 ----------

// hex 팔레트를 [r,g,b,hex] 목록으로 미리 변환 (매 픽셀 파싱 방지).
export function paletteRgb(palette) {
  const out = [];
  if (!Array.isArray(palette)) return out;
  for (const hex of palette) {
    const c = hexToRgb(hex);
    if (c) out.push([c[0], c[1], c[2], hex.toLowerCase()]);
  }
  return out;
}

// 가중 제곱거리(눈이 민감한 초록에 큰 가중). 값 자체보다 상대 비교용.
// 대략 채널당 차이 n일 때 거리 ≈ 10·n² — 임계값을 잡을 때의 감각.
export function colorDistance(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return 3 * dr * dr + 6 * dg * dg + db * db;
}

// 가중 유클리드 거리로 가장 가까운 색. 동점이면 앞쪽(팔레트 순서) 우선.
// palette는 hex 배열 또는 paletteRgb() 결과 둘 다 받는다.
export function nearestColor(r, g, b, palette) {
  const list = Array.isArray(palette) && Array.isArray(palette[0]) ? palette : paletteRgb(palette);
  let best = null, bestD = Infinity;
  const c = [r, g, b];
  for (const p of list) {
    const d = colorDistance(c, p);
    if (d < bestD) { bestD = d; best = p[3]; }
  }
  return best;
}

// ---------- DOM 의존 (브라우저 전용) ----------

// 이미지를 최대 maxDim 이내로 축소해 RGBA를 읽는다 (양자화 입력용).
export function imageToImageData(img, maxDim = 128) {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// 이미지 → 대표색 hex 배열.
export function extractPalette(img, n = 16, maxDim = 128) {
  return extractPaletteFromImageData(imageToImageData(img, maxDim).data, n);
}
