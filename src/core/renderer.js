// 캔버스 렌더링: 체커보드 → 픽셀 → 그리드 순서로 매 프레임 전체 다시 그린다 (SKILL.md).
// 캔버스 내부 해상도 = size × cell, cell = max(4, floor(640 / size)).

export function cellSize(size) {
  return Math.max(4, Math.floor(640 / size));
}

// selection: { x, y, w, h, float } | null — 점선 테두리 오버레이.
// float(w*h 픽셀 배열)가 있으면 이동 중인 선택 픽셀을 그리드 위에 겹쳐 그린다.
export function render(canvas, pixels, size, showGrid, onion = null, reference = null, refAlpha = 1, selection = null) {
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
  // refAlpha: 밑그림 투명도(0~1). 낮추면 체커보드가 비쳐 연한 가이드가 된다.
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

  // 픽셀
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = pixels[y * size + x];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  // 그리드
  if (showGrid) {
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
