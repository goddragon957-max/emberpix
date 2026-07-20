// 사각 선택 영역 순수 로직. rect = { x, y, w, h } (셀 단위, w/h ≥ 1).
// 모든 함수는 원본 픽셀 배열을 변경하지 않고 새 배열을 반환한다.

// 드래그 시작/끝 셀 좌표 → 정규화된 rect (끝 셀 포함).
export function normalizeRect(x0, y0, x1, y1) {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  return { x, y, w: Math.abs(x1 - x0) + 1, h: Math.abs(y1 - y0) + 1 };
}

export function inRect(rect, x, y) {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
}

// rect 영역 픽셀을 w*h 배열로 추출. 캔버스 밖 셀은 null.
export function extractRect(pixels, size, rect) {
  const out = new Array(rect.w * rect.h).fill(null);
  for (let dy = 0; dy < rect.h; dy++) {
    for (let dx = 0; dx < rect.w; dx++) {
      const x = rect.x + dx;
      const y = rect.y + dy;
      if (x >= 0 && y >= 0 && x < size && y < size) {
        out[dy * rect.w + dx] = pixels[y * size + x];
      }
    }
  }
  return out;
}

// rect 영역을 투명(null)으로 지운 새 배열.
export function clearRect(pixels, size, rect) {
  const out = pixels.slice();
  for (let dy = 0; dy < rect.h; dy++) {
    for (let dx = 0; dx < rect.w; dx++) {
      const x = rect.x + dx;
      const y = rect.y + dy;
      if (x >= 0 && y >= 0 && x < size && y < size) {
        out[y * size + x] = null;
      }
    }
  }
  return out;
}

// w*h 플로트 데이터를 (dx, dy) 위치에 찍은 새 배열.
// null 셀은 건너뜀(투명 유지), 캔버스 밖은 잘려나감.
export function stampPixels(pixels, size, data, w, h, dx, dy) {
  const out = pixels.slice();
  for (let fy = 0; fy < h; fy++) {
    for (let fx = 0; fx < w; fx++) {
      const c = data[fy * w + fx];
      if (c === null) continue;
      const x = dx + fx;
      const y = dy + fy;
      if (x >= 0 && y >= 0 && x < size && y < size) {
        out[y * size + x] = c;
      }
    }
  }
  return out;
}

// w*h 플로트 데이터 좌우반전.
export function flipX(data, w, h) {
  const out = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[y * w + x] = data[y * w + (w - 1 - x)];
    }
  }
  return out;
}
