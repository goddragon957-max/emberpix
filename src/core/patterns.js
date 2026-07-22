// 보석십자수 내장 도안 — 셀마다 목표 색(hex)|null 배열을 size에 맞춰 생성.
// null = 배경(보석 안 놓는 칸). 페인트-바이-넘버로 채운다.

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

// 하트 — 하트 부등식. 3색(빨강 몸통 / 주황 하이라이트 / 퍼플 그림자).
export function heartPattern(n) {
  const out = new Array(n * n).fill(null);
  const s = n * 0.39;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const nx = (x + 0.5 - n / 2) / s;
      const ny = -(y + 0.5 - (n / 2 - 1)) / s;
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
  const cx = n / 2, cy = n / 2;
  const outer = n * 0.47, inner = n * 0.2;
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
  const cx = n / 2, cy = n * 0.44;
  const petalR = n * 0.16, ring = n * 0.24, coreR = n * 0.15;
  const inCircle = (x, y, ox, oy, r) => (x - ox) ** 2 + (y - oy) ** 2 <= r * r;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const px = x + 0.5, py = y + 0.5;
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

export const BUILTIN_PATTERNS = [
  { name: "하트", make: heartPattern },
  { name: "별", make: starPattern },
  { name: "꽃", make: flowerPattern },
];
