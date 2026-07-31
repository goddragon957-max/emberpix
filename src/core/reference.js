// 색칠공부 참조 이미지: 파일 → 그리드 크기로 다운샘플한 흑백 밝기 배열.
// 셀 값은 0~255 정수, 이미지가 없는 영역(레터박스/투명)은 null.

export function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 로드 실패"));
    };
    img.src = url;
  });
}

// 비율 유지(contain) + 중앙 정렬로 size×size 격자에 다운샘플한 RGBA 바이트.
// 색칠공부(밝기)와 보석십자수 도안(컬러)이 같은 격자 정렬을 쓰도록 공유한다.
export function sampleGrid(img, size) {
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ctx = off.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return ctx.getImageData(0, 0, size, size).data;
}

// 다운샘플 격자에서 흑백 밝기 추출.
export function sampleReference(img, size) {
  const data = sampleGrid(img, size);
  const out = new Array(size * size).fill(null);
  for (let i = 0; i < size * size; i++) {
    const a = data[i * 4 + 3];
    if (a < 32) continue; // 투명/레터박스 영역은 가이드 없음
    const lum =
      0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
    out[i] = Math.round(lum);
  }
  return out;
}
