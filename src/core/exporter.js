// 내보내기 — 투명 PNG / 스프라이트시트(+JSON 메타) / 애니메이션 GIF / 클립보드.
// imageSmoothing 끔 → 픽셀 경계 보존. 빈 픽셀(null)은 칠하지 않아 배경 투명 유지.
// 프레임 여러 개는 가로 1열 스프라이트 시트로 출력 (폭 = size × scale × N).

import { encodeGif } from "./gif.js";

const APP_TAG = "emberpix";
const META_VERSION = 1;

function paintFrame(ctx, pixels, size, scale, offsetX) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = pixels[y * size + x];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(offsetX + x * scale, y * scale, scale, scale);
      }
    }
  }
}

// 프레임 목록을 가로로 이어 붙인 오프스크린 캔버스.
export function sheetCanvas(frames, size, scale) {
  const off = document.createElement("canvas");
  off.width = size * scale * frames.length;
  off.height = size * scale;
  const ctx = off.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  frames.forEach((pixels, i) => paintFrame(ctx, pixels, size, scale, i * size * scale));
  return off;
}

function download(href, name) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  download(url, name);
  // 클릭 직후 해제하면 일부 브라우저에서 저장이 취소된다 — 한 틱 뒤에.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sheetName(size, n, scale, ext = "png") {
  const tag = n > 1 ? `${n}f_` : "";
  return `emberpix_${size}x${size}_${tag}${scale}x.${ext}`;
}

// frames: 픽셀 배열 목록. 1개면 단일 프레임 PNG와 동일.
export function exportSheet(frames, size, scale) {
  const off = sheetCanvas(frames, size, scale);
  download(off.toDataURL("image/png"), sheetName(size, frames.length, scale));
}

// ---------- 스프라이트시트 메타데이터 ----------

// 시트 PNG와 짝이 되는 JSON. 게임 쪽에서 프레임을 잘라 쓰기 위한 최소 정보다.
// 좌표 단위는 출력 PNG의 픽셀(= 셀 좌표 × scale).
//
//  app/version  포맷 식별자
//  image        짝이 되는 PNG 파일 이름
//  cellSize     원본 그리드 한 변(16/32/64)
//  scale        내보내기 배율
//  frameWidth/frameHeight  프레임 한 장의 출력 크기 (= cellSize × scale)
//  sheetWidth/sheetHeight  시트 전체 크기
//  columns/rows 프레임 배치 (현재는 가로 1열이라 rows = 1)
//  fps          재생 속도. durationMs = 프레임 1장의 표시 시간
//  frames[]     { index, x, y, w, h, durationMs } — x는 프레임 좌상단
export function sheetMeta(frames, size, scale, fps) {
  const n = frames.length;
  const fw = size * scale;
  const rate = fps > 0 ? fps : 8;
  const durationMs = Math.round(1000 / rate);
  return {
    app: APP_TAG,
    version: META_VERSION,
    image: sheetName(size, n, scale),
    cellSize: size,
    scale,
    frameWidth: fw,
    frameHeight: fw,
    sheetWidth: fw * n,
    sheetHeight: fw,
    columns: n,
    rows: 1,
    frameCount: n,
    fps: rate,
    durationMs,
    totalDurationMs: durationMs * n,
    frames: Array.from({ length: n }, (_, i) => ({
      index: i,
      x: i * fw,
      y: 0,
      w: fw,
      h: fw,
      durationMs,
    })),
  };
}

// 시트 PNG + 메타 JSON을 함께 저장.
export function exportSheetWithMeta(frames, size, scale, fps) {
  exportSheet(frames, size, scale);
  const meta = sheetMeta(frames, size, scale, fps);
  downloadBlob(
    new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" }),
    sheetName(size, frames.length, scale, "json")
  );
  return meta;
}

// ---------- GIF ----------

// 애니메이션 GIF 저장. 인코딩은 gif.js(무의존 GIF89a).
export function exportGif(frames, size, { scale = 4, fps = 8 } = {}) {
  const blob = encodeGif(frames, size, { scale, fps });
  downloadBlob(blob, sheetName(size, frames.length, scale, "gif"));
  return blob.size;
}

// ---------- 클립보드 ----------

// 현재 프레임 PNG를 클립보드에 복사. 성공하면 true.
// 지원하지 않는 브라우저/권한 거부는 false로 돌려 호출부가 안내하게 한다.
export async function copyFrameToClipboard(pixels, size, scale) {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") return false;
  const off = sheetCanvas([pixels], size, scale);
  const blob = await new Promise((resolve) => off.toBlob(resolve, "image/png"));
  if (!blob) return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}
