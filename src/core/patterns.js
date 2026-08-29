// 보석십자수 내장 도안 — 셀마다 목표 색(hex)|null 배열을 size에 맞춰 생성.
// null = 배경(보석 안 놓는 칸). 페인트-바이-넘버로 채운다.

import { validateScaledTemplateSource } from "./gridValidation.js";

const idx = (x, y, n) => y * n + x;

function pointInPoly(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i];
    const [xj, yj] = verts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// 하트 부등식 (x²+y²-1)³ ≤ x²y³ 의 실제 경계 — 수치로 구한 상수.
// 이 값으로 맞춰야 도안이 캔버스 밖으로 잘리지 않는다(예전엔 위가 잘렸다).
const HEART_W = 2.278; // x: -1.139 ~ 1.139
const HEART_H = 2.236; // y: -1.000 ~ 1.236
const HEART_CY = 0.118; // 세로 중심 (아래로 뾰족해 위쪽이 더 길다)

// 하트 — 하트 부등식. 3색(빨강 몸통 / 주황 하이라이트 / 퍼플 그림자).
export function heartPattern(n) {
  const out = new Array(n * n).fill(null);
  // 긴 축을 (n - 1.5)에 맞춰 사방에 최소 여백을 남긴다.
  const s = (n - 1.5) / Math.max(HEART_W, HEART_H);
  // 곡선의 세로 중심이 격자 중심에 오도록 기준점을 옮긴다.
  const cy = n / 2 + 0.5 + HEART_CY * s;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const nx = (x + 0.5 - n / 2) / s;
      const ny = -(y + 0.5 - cy) / s;
      const f = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
      if (f <= 0) {
        let c = "#b13e53";
        const hl = -nx * 0.5 + ny * 0.6;
        if (hl > 0.55) c = "#ef7d57";
        if (hl > 0.95) c = "#ffcd75";
        if (ny < -0.35 && Math.abs(nx) < 0.5) c = "#5d275d";
        out[idx(x, y, n)] = c;
      }
    }
  }
  return out;
}

// 별 — 5각 별 다각형. 2색(노랑 몸통 / 주황 테두리).
export function starPattern(n) {
  const out = new Array(n * n).fill(null);
  const cx = n / 2,
    cy = n / 2;
  const outer = n * 0.47,
    inner = n * 0.2;
  const verts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (pointInPoly(x + 0.5, y + 0.5, verts)) {
        // 중심에서 멀수록 주황 테두리
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / outer;
        out[idx(x, y, n)] = d > 0.62 ? "#ef7d57" : "#ffcd75";
      }
    }
  }
  return out;
}

// 꽃 — 중심 원 + 6장 꽃잎 + 줄기. 4색.
export function flowerPattern(n) {
  const out = new Array(n * n).fill(null);
  const cx = n / 2,
    cy = n * 0.44;
  const petalR = n * 0.16,
    ring = n * 0.24,
    coreR = n * 0.15;
  const inCircle = (x, y, ox, oy, r) => (x - ox) ** 2 + (y - oy) ** 2 <= r * r;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const px = x + 0.5,
        py = y + 0.5;
      // 줄기
      if (px > cx - n * 0.06 && px < cx + n * 0.06 && py > cy && py < n - 0.5) {
        out[idx(x, y, n)] = "#38b764";
        continue;
      }
      // 꽃잎
      let petal = false;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        if (inCircle(px, py, cx + ring * Math.cos(a), cy + ring * Math.sin(a), petalR)) {
          petal = true;
          break;
        }
      }
      if (inCircle(px, py, cx, cy, coreR)) out[idx(x, y, n)] = "#ffcd75";
      else if (petal) out[idx(x, y, n)] = "#b13e53";
    }
  }
  return out;
}

// 무지개 — 다섯 색 반원 띠. 양끝과 윗부분 모두 한 칸 이상 비운다.
export function rainbowPattern(n) {
  const out = new Array(n * n).fill(null);
  const cx = n / 2;
  const baseY = n * 0.77;
  const outer = n * 0.4;
  const band = n * 0.07;
  const colors = ["#b13e53", "#ef7d57", "#ffcd75", "#a7f070", "#41a6f6"];

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (py > baseY) continue;

      const radius = Math.hypot(px - cx, py - baseY);
      const bandIndex = Math.floor((outer - radius) / band);
      if (bandIndex >= 0 && bandIndex < colors.length) {
        out[idx(x, y, n)] = colors[bandIndex];
      }
    }
  }
  return out;
}

// 로켓 — 창, 양쪽 날개, 불꽃을 가진 작은 우주선.
export function rocketPattern(n) {
  const out = new Array(n * n).fill(null);
  const cx = n / 2;
  const body = [
    [cx, n * 0.12],
    [cx + n * 0.19, n * 0.34],
    [cx + n * 0.19, n * 0.66],
    [cx + n * 0.08, n * 0.76],
    [cx, n * 0.85],
    [cx - n * 0.08, n * 0.76],
    [cx - n * 0.19, n * 0.66],
    [cx - n * 0.19, n * 0.34],
  ];
  const leftFin = [
    [cx - n * 0.19, n * 0.58],
    [cx - n * 0.34, n * 0.78],
    [cx - n * 0.08, n * 0.73],
  ];
  const rightFin = leftFin.map(([x, y]) => [cx + (cx - x), y]);
  const flame = [
    [cx - n * 0.09, n * 0.83],
    [cx + n * 0.09, n * 0.83],
    [cx, n * 0.91],
  ];
  const windowY = n * 0.43;
  const windowR = n * 0.08;

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let color = null;
      if (pointInPoly(px, py, flame)) color = "#ffcd75";
      if (pointInPoly(px, py, leftFin) || pointInPoly(px, py, rightFin)) color = "#ef7d57";
      if (pointInPoly(px, py, body)) color = "#e8f4ff";
      if ((px - cx) ** 2 + (py - windowY) ** 2 <= windowR ** 2) color = "#29366f";
      out[idx(x, y, n)] = color;
    }
  }
  return out;
}

// 고양이 — 둥근 얼굴, 귀, 눈과 코가 보이는 친근한 얼굴 도안.
export function catPattern(n) {
  const out = new Array(n * n).fill(null);
  const cx = n / 2;
  const cy = n * 0.54;
  const headR = n * 0.27;
  const leftEar = [
    [cx - n * 0.24, n * 0.43],
    [cx - n * 0.18, n * 0.17],
    [cx - n * 0.02, n * 0.36],
  ];
  const rightEar = leftEar.map(([x, y]) => [cx + (cx - x), y]);
  const leftInnerEar = [
    [cx - n * 0.18, n * 0.4],
    [cx - n * 0.16, n * 0.25],
    [cx - n * 0.07, n * 0.37],
  ];
  const rightInnerEar = leftInnerEar.map(([x, y]) => [cx + (cx - x), y]);
  const eyeR = n * 0.055;
  const noseR = n * 0.06;

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const leftEye = (px - (cx - n * 0.1)) ** 2 + (py - (cy - n * 0.02)) ** 2 <= eyeR ** 2;
      const rightEye = (px - (cx + n * 0.1)) ** 2 + (py - (cy - n * 0.02)) ** 2 <= eyeR ** 2;
      const nose = (px - cx) ** 2 + (py - (cy + n * 0.1)) ** 2 <= noseR ** 2;
      const head = (px - cx) ** 2 + (py - cy) ** 2 <= headR ** 2;
      let color = null;
      if (pointInPoly(px, py, leftEar) || pointInPoly(px, py, rightEar)) color = "#ffcd75";
      if (pointInPoly(px, py, leftInnerEar) || pointInPoly(px, py, rightInnerEar)) color = "#ef7d57";
      if (head) color = "#ffcd75";
      if (leftEye || rightEye) color = "#29366f";
      if (nose) color = "#b13e53";
      out[idx(x, y, n)] = color;
    }
  }
  return out;
}

function scaledTemplatePattern(name, template, palette) {
  const { rows, height, palette: validatedPalette, width } = validateScaledTemplateSource(
    name,
    template,
    palette,
  );

  return function makeScaledTemplate(n) {
    const out = new Array(n * n).fill(null);
    const margin = Math.max(1, Math.floor(n * 0.12));
    const drawWidth = Math.max(1, n - margin * 2);
    const drawHeight = Math.max(1, n - margin * 2);

    for (let y = 0; y < drawHeight; y += 1) {
      for (let x = 0; x < drawWidth; x += 1) {
        const sx = Math.floor((x * width) / drawWidth);
        const sy = Math.floor((y * height) / drawHeight);
        const cell = rows[sy][sx];
        const color = validatedPalette[cell] ?? null;
        if (!color) continue;
        out[idx(x + margin, y + margin, n)] = color;
      }
    }

    return out;
  };
}

function fullGridTemplatePattern(name, template, palette) {
  const { rows, height, palette: validatedPalette, width } = validateScaledTemplateSource(
    name,
    template,
    palette,
    {
      expectedWidth: 16,
      expectedHeight: 16,
      label: "보석 템플릿 원본",
    },
  );

  return function makeFullGridTemplate(n) {
    const out = new Array(n * n).fill(null);

    for (let y = 0; y < n; y += 1) {
      const sy = Math.min(height - 1, Math.floor((y * height) / n));

      for (let x = 0; x < n; x += 1) {
        const sx = Math.min(width - 1, Math.floor((x * width) / n));
        const cell = rows[sy][sx];
        out[idx(x, y, n)] = validatedPalette[cell] ?? null;
      }
    }

    return out;
  };
}

const sunPattern = fullGridTemplatePattern(
  "해님",
  `
................
.......1........
....1..1..1.....
.....122221.....
...1122222211...
...1222222221...
.11122222222111.
..122222222221..
..122222222221..
.11122222222111.
...1222222221...
...1122222211...
.....122221.....
....1..1..1.....
.......1........
................
`,
  {
    "1": "#ffcd75",
    "2": "#ef7d57",
  },
);

const moonPattern = scaledTemplatePattern(
  "초승달",
  `
...11...
..1221..
.1222...
.1222...
.1222...
.1222...
..1221..
...11...
`,
  {
    "1": "#ffcd75",
    "2": "#fff1b8",
  },
);

const cloudPattern = fullGridTemplatePattern(
  "구름",
  `
................
................
................
......11........
....111111......
..1112222111....
.122222222211...
.1222222222221..
.12222222222221.
.12222222222221.
..112222222221..
....111111111...
................
................
................
................
`,
  {
    "1": "#e8f4ff",
    "2": "#41a6f6",
  },
);

const treePattern = scaledTemplatePattern(
  "나무",
  `
...1....
..121...
.12221..
1222221.
..222...
...3....
...3....
..333...
`,
  {
    "1": "#a7f070",
    "2": "#38b764",
    "3": "#8f563b",
  },
);

const housePattern = fullGridTemplatePattern(
  "집",
  `
................
................
.......1........
......111.......
.....11111......
....1111111.....
...111111111....
..11222222211...
.1222222222221..
.1222332233221..
.1222332233221..
.1222224422221..
.1222224422221..
.1222224422221..
.1111111111111..
................
`,
  {
    "1": "#ef7d57",
    "2": "#b13e53",
    "3": "#fff1b8",
    "4": "#8f563b",
  },
);

const fishPattern = fullGridTemplatePattern(
  "물고기",
  `
................
................
................
...........4....
.........1121...
.....11.122221..
...112222222221.
..1222222222231.
.12222222222221.
..1222222222231.
...1144.222221..
.....11.122221..
.........1121...
...........4....
................
................
`,
  {
    "1": "#41a6f6",
    "2": "#73eff7",
    "3": "#29366f",
    "4": "#ffcd75",
  },
);

const butterflyPattern = scaledTemplatePattern(
  "나비",
  `
1.2..2.1
11211211
.122221.
..1231..
..1231..
.122221.
11211211
1.2..2.1
`,
  {
    "1": "#b13e53",
    "2": "#ffcd75",
    "3": "#29366f",
  },
);

const mushroomPattern = scaledTemplatePattern(
  "버섯",
  `
........
..1111..
.122221.
12222221
.111111.
...33...
..3333..
...33...
`,
  {
    "1": "#ef7d57",
    "2": "#fff1b8",
    "3": "#8f563b",
  },
);

const applePattern = scaledTemplatePattern(
  "사과",
  `
...11...
..1221..
.122221.
12222221
12222221
12222221
.122221.
..111...
`,
  {
    "1": "#38b764",
    "2": "#d95763",
  },
);

const cherryPattern = scaledTemplatePattern(
  "체리",
  `
...1.1..
..12121.
...1.1..
..2...2.
.233.332
23332332
.233.332
..22222.
`,
  {
    "1": "#38b764",
    "2": "#b13e53",
    "3": "#ef7d57",
  },
);

const cupcakePattern = scaledTemplatePattern(
  "컵케이크",
  `
...11...
..1221..
.122221.
12222221
.333333.
33333333
33333333
.444444.
`,
  {
    "1": "#fff1b8",
    "2": "#ffcd75",
    "3": "#d77bba",
    "4": "#8f563b",
  },
);

const crownPattern = scaledTemplatePattern(
  "왕관",
  `
1..1..1.
11.11.11
12222221
.222222.
.233332.
23333332
23333332
.444444.
`,
  {
    "1": "#ffcd75",
    "2": "#ef7d57",
    "3": "#ffcd75",
    "4": "#b13e53",
  },
);

const dinosaurPattern = fullGridTemplatePattern(
  "공룡",
  `
................
................
..........11....
........11221...
.......122221...
...11112222221..
..122222222221..
.122222222221...
.12222222221....
.12222422221....
.12222222111....
..12222221......
...113311.......
...13..31.......
................
................
`,
  {
    "1": "#a7f070",
    "2": "#38b764",
    "3": "#8f563b",
    "4": "#29366f",
  },
);

const robotPattern = fullGridTemplatePattern(
  "로봇",
  `
................
.......1........
.......4........
.....11111......
....1222221.....
...122333221....
...123232321....
...122333221....
...122222221....
....1122211.....
...144444441....
..1441221441....
..14..11..41....
..44..11..44....
................
................
`,
  {
    "1": "#73eff7",
    "2": "#e8f4ff",
    "3": "#29366f",
    "4": "#8f563b",
  },
);

export const BUILTIN_PATTERNS = [
  { name: "하트", make: heartPattern },
  { name: "별", make: starPattern },
  { name: "꽃", make: flowerPattern },
  { name: "무지개", make: rainbowPattern },
  { name: "로켓", make: rocketPattern },
  { name: "고양이", make: catPattern },
  { name: "해님", make: sunPattern },
  { name: "초승달", make: moonPattern },
  { name: "구름", make: cloudPattern },
  { name: "나무", make: treePattern },
  { name: "집", make: housePattern },
  { name: "물고기", make: fishPattern },
  { name: "나비", make: butterflyPattern },
  { name: "버섯", make: mushroomPattern },
  { name: "사과", make: applePattern },
  { name: "체리", make: cherryPattern },
  { name: "컵케이크", make: cupcakePattern },
  { name: "왕관", make: crownPattern },
  { name: "공룡", make: dinosaurPattern },
  { name: "로봇", make: robotPattern },
];
