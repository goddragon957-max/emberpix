// 투명 PNG 내보내기. imageSmoothing 끔 → 픽셀 경계 보존.
// 빈 픽셀(null)은 칠하지 않아 배경 투명 유지.

export function exportPNG(pixels, size, scale) {
  const off = document.createElement("canvas");
  off.width = size * scale;
  off.height = size * scale;
  const ctx = off.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = pixels[y * size + x];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  const a = document.createElement("a");
  a.href = off.toDataURL("image/png");
  a.download = `emberpix_${size}x${size}_${scale}x.png`;
  a.click();
}
