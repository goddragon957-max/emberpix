// PWA 아이콘 생성기 — 의존성 없이 Node 내장 zlib로 PNG를 직접 쓴다.
// 아이콘 자체도 픽셀아트(16×16 마크를 정수배 확대)라 앱 성격과 맞는다.
//
//   node tools/make-icons.mjs
//
// 결과물은 public/ 에 커밋한다 (빌드 때마다 다시 만들 필요 없음).

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// ---------- PNG 인코딩 ----------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// rgba: Uint8Array(w*h*4) → PNG 버퍼 (8비트 트루컬러+알파, 필터 0)
function encodePng(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  // 10~12: compression / filter / interlace 모두 0

  // 스캔라인마다 필터 바이트(0) 붙이기
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const src = y * w * 4;
    const dst = y * (w * 4 + 1);
    raw[dst] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + src, w * 4).copy(raw, dst + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- 마크 (16×16 픽셀아트 불꽃) ----------

// '.' 배경 / 'o' 불꽃 / 'i' 밝은 심지
const MARK = [
  "................",
  ".......oo.......",
  "......oooo......",
  "......oooo......",
  ".....oooooo.....",
  ".....oooooo.....",
  "....oooiioooo...",
  "....ooiiiioo....",
  "...oooiiiiooo...",
  "...oooiiiiooo...",
  "...oooiiiiooo...",
  "....ooiiiioo....",
  "....oooiioooo...",
  ".....oooooo.....",
  "......oooo......",
  "................",
];

const COLORS = {
  bg: [20, 21, 25, 255],      // #141519 — 디자인 토큰
  o: [255, 122, 47, 255],     // #ff7a2f
  i: [255, 205, 117, 255],    // #ffcd75
};

// size×size 아이콘. 마크는 가운데 safeRatio 비율 안에만 그린다
// (마스커블 아이콘은 가장자리가 잘릴 수 있다).
function renderIcon(size, safeRatio = 0.62) {
  const px = new Uint8Array(size * size * 4);
  // 배경 채우기
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = COLORS.bg[0];
    px[i * 4 + 1] = COLORS.bg[1];
    px[i * 4 + 2] = COLORS.bg[2];
    px[i * 4 + 3] = 255;
  }
  // 마크를 정수배로 확대해 중앙 배치 (정수배라 픽셀 경계가 흐려지지 않는다)
  const n = MARK.length;
  const scale = Math.max(1, Math.floor((size * safeRatio) / n));
  const off = Math.floor((size - n * scale) / 2);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const c = COLORS[MARK[y][x]];
      if (!c) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = ((off + y * scale + dy) * size + (off + x * scale + dx)) * 4;
          px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
        }
      }
    }
  }
  return px;
}

mkdirSync(OUT, { recursive: true });
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["favicon-32.png", 32],
]) {
  const file = join(OUT, name);
  writeFileSync(file, encodePng(renderIcon(size), size, size));
  console.log(`${name} — ${size}×${size}`);
}
