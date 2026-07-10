// 캔버스 렌더링: 체커보드 → 픽셀 → 그리드 순서로 매 프레임 전체 다시 그린다 (SKILL.md).
// 캔버스 내부 해상도 = size × cell, cell = max(4, floor(640 / size)).

export function cellSize(size) {
  return Math.max(4, Math.floor(640 / size));
}

export function render(canvas, pixels, size, showGrid, onion = null) {
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
