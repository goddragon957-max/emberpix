// 투명 PNG 내보내기. imageSmoothing 끔 → 픽셀 경계 보존.
// 빈 픽셀(null)은 칠하지 않아 배경 투명 유지.
// 프레임 여러 개는 가로 1열 스프라이트 시트로 출력 (폭 = size × N).

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

// frames: 픽셀 배열 목록. 1개면 단일 프레임 PNG와 동일.
export function exportSheet(frames, size, scale) {
  const n = frames.length;
  const off = document.createElement("canvas");
  off.width = size * scale * n;
  off.height = size * scale;
  const ctx = off.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  frames.forEach((pixels, i) => {
    paintFrame(ctx, pixels, size, scale, i * size * scale);
  });

  const a = document.createElement("a");
  a.href = off.toDataURL("image/png");
  const tag = n > 1 ? `${n}f_` : "";
  a.download = `emberpix_${size}x${size}_${tag}${scale}x.png`;
  a.click();
}
