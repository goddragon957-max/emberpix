// 캔버스 렌더링: 체커보드 → 픽셀 → 그리드 순서로 매 프레임 전체 다시 그린다 (SKILL.md).
// 캔버스 내부 해상도 = size × cell, cell = max(4, floor(640 / size)).

export function cellSize(size) {
  return Math.max(4, Math.floor(640 / size));
}

export function render(canvas, pixels, size, showGrid) {
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
