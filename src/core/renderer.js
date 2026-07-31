// 캔버스 렌더링: 체커보드 → 밑그림 → 픽셀 → 그리드 순서로 매 프레임 전체 다시 그린다 (SKILL.md).
// 캔버스 내부 해상도 = size × cell, cell = max(4, floor(640 / size)).

export function cellSize(size) {
  return Math.max(4, Math.floor(640 / size));
}

// #rrggbb 를 f만큼 밝게(f>0)/어둡게(f<0). 파싱 실패 시 원색 반환.
function shade(hex, f) {
  if (typeof hex !== "string" || hex.length !== 7 || hex[0] !== "#") return hex;
  const t = f > 0 ? 255 : 0;
  const a = Math.abs(f);
  const ch = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (t - v) * a);
  };
  return `rgb(${ch(1)},${ch(3)},${ch(5)})`;
}

// 보석알(비드) 한 칸: 어두운 링 → 몸통 → 좌상단 하이라이트 → 반짝임.
function drawBead(ctx, ox, oy, s, hex) {
  const cx = ox + s / 2, cy = oy + s / 2, R = s * 0.46, PI2 = Math.PI * 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, PI2); ctx.fillStyle = shade(hex, -0.28); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.8, 0, PI2); ctx.fillStyle = hex; ctx.fill();
  ctx.beginPath(); ctx.arc(cx - R * 0.26, cy - R * 0.26, R * 0.36, 0, PI2); ctx.fillStyle = shade(hex, 0.4); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - R * 0.32, cy - R * 0.32, R * 0.15, 0, PI2); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
}

// opts: { showGrid, onion, reference, refAlpha, selection, gem, pattern, patternFilter, preview }
//  - onion: 이전 프레임 픽셀(30%)  - reference: 색칠공부 흑백 밝기 배열 + refAlpha
//  - selection: { x,y,w,h,float } 점선 오버레이
//  - gem: true면 픽셀을 보석알로 렌더  - pattern: 보석십자수 목표색 배열(가이드 점)
//  - patternFilter: hex. 그 색 칸만 또렷하게, 나머지 목표 칸은 잠금(아주 흐리게)
//  - preview: { points:[[x,y]...], color } 도형 확정 전 미리보기(픽셀 데이터 불변)
export function render(canvas, pixels, size, opts = {}) {
  const {
    showGrid = false, onion = null, reference = null, refAlpha = 1,
    selection = null, gem = false, pattern = null, patternFilter = null, preview = null,
  } = opts;
  const cell = cellSize(size);
  canvas.width = size * cell;
  canvas.height = size * cell;
  const ctx = canvas.getContext("2d");

  // 체커보드 (투명 배경 표시)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#23252d" : "#1b1d23";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  // 색칠공부 참조 이미지 (흑백 밝기, 그린 픽셀 아래에 깔림 — 내보내기 미포함)
  if (reference) {
    ctx.globalAlpha = refAlpha;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = reference[y * size + x];
        if (v !== null) {
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // 보석십자수 도안 가이드: 아직 안 놓은 목표 칸을 흐린 점으로 표시.
  // 색 필터가 켜져 있으면 그 색만 또렷하고 크게, 나머지는 잠긴 것처럼 아주 흐리게.
  if (gem && pattern) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        if (pixels[i] !== null || !pattern[i]) continue;
        const on = !patternFilter || pattern[i] === patternFilter;
        ctx.globalAlpha = patternFilter ? (on ? 0.55 : 0.1) : 0.3;
        ctx.fillStyle = pattern[i];
        ctx.beginPath();
        ctx.arc(x * cell + cell / 2, y * cell + cell / 2, cell * (on && patternFilter ? 0.24 : 0.16), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // 어니언 스킨 (이전 프레임 30% 투명도, 현재 픽셀 아래에 표시)
  if (onion) {
    ctx.globalAlpha = 0.3;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const c = onion[y * size + x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // 픽셀 (보석 모드면 비드, 아니면 사각)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = pixels[y * size + x];
      if (c) {
        if (gem) drawBead(ctx, x * cell, y * cell, cell, c);
        else {
          ctx.fillStyle = c;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
  }

  // 그리드 (보석 모드에서는 숨김 — 비드 사이가 지저분해짐)
  if (showGrid && !gem) {
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    for (let i = 1; i < size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell + 0.5, 0);
      ctx.lineTo(i * cell + 0.5, size * cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell + 0.5);
      ctx.lineTo(size * cell, i * cell + 0.5);
      ctx.stroke();
    }
  }

  // 도형 미리보기 — 확정 전이므로 오버레이로만 그린다(픽셀 데이터 오염 금지).
  if (preview && preview.points) {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = preview.color;
    for (const [x, y] of preview.points) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
    ctx.globalAlpha = 1;
  }

  // 선택 영역 (플로트 픽셀 → 하이라이트 → 점선 테두리 순, 최상단)
  if (selection) {
    const { x, y, w, h, float } = selection;
    if (float) {
      for (let fy = 0; fy < h; fy++) {
        for (let fx = 0; fx < w; fx++) {
          const c = float[fy * w + fx];
          if (c) {
            ctx.fillStyle = c;
            ctx.fillRect((x + fx) * cell, (y + fy) * cell, cell, cell);
          }
        }
      }
    }
    ctx.fillStyle = "rgba(255,122,47,0.10)";
    ctx.fillRect(x * cell, y * cell, w * cell, h * cell);
    ctx.strokeStyle = "#ff7a2f";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x * cell + 1, y * cell + 1, w * cell - 2, h * cell - 2);
    ctx.setLineDash([]);
  }
}

// 3×3 반복 타일 미리보기 (심리스 타일 확인용).
// 1셀 = 1px 내부 해상도로 좌상단 타일을 그린 뒤 8회 복제,
// 표시 확대는 CSS(image-rendering: pixelated)에 맡긴다.
export function renderTilePreview(canvas, pixels, size) {
  canvas.width = size * 3;
  canvas.height = size * 3;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = pixels[y * size + x];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  for (let ty = 0; ty < 3; ty++) {
    for (let tx = 0; tx < 3; tx++) {
      if (tx === 0 && ty === 0) continue;
      ctx.drawImage(canvas, 0, 0, size, size, tx * size, ty * size, size, size);
    }
  }
}
