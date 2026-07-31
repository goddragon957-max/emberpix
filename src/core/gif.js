// 무의존 GIF89a 인코더 (애니메이션). 외부 라이브러리 없이 직접 구현한다.
// 픽셀아트는 색이 256개 이하라 전역 팔레트 + LZW 원본 압축으로 손실 없이 담긴다.
//
// 구조: Header → Logical Screen Descriptor → Global Color Table
//       → (Netscape Application Extension: 반복)
//       → 프레임마다 (Graphic Control Extension → Image Descriptor → LZW 데이터)
//       → Trailer(0x3B)
//
// 투명: 팔레트 0번을 투명 인덱스로 예약하고 GCE의 transparent flag를 켠다.
// 프레임 처분(disposal)은 2(배경으로 복원) — 프레임마다 전체를 다시 그리므로
// 이전 프레임이 비쳐 보이지 않는다.

// ---------- 바이트 버퍼 ----------

function createWriter() {
  let buf = new Uint8Array(1024);
  let len = 0;
  const ensure = (n) => {
    if (len + n <= buf.length) return;
    let cap = buf.length * 2;
    while (cap < len + n) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(buf.subarray(0, len));
    buf = next;
  };
  return {
    byte(v) { ensure(1); buf[len++] = v & 0xff; },
    bytes(arr) { ensure(arr.length); buf.set(arr, len); len += arr.length; },
    // GIF의 수치는 리틀엔디언 16비트.
    short(v) { ensure(2); buf[len++] = v & 0xff; buf[len++] = (v >> 8) & 0xff; },
    ascii(s) { for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)); },
    result() { return buf.slice(0, len); },
  };
}

// ---------- 팔레트 ----------

// 전역 색 테이블 크기는 2의 거듭제곱(2~256)이어야 한다.
function tableSize(n) {
  let size = 2;
  while (size < n) size *= 2;
  return Math.min(256, Math.max(2, size));
}

// 색 테이블 비트 = log2(size) - 1 (Logical Screen Descriptor의 하위 3비트).
function tableBits(size) {
  return Math.round(Math.log2(size)) - 1;
}

// ---------- LZW 압축 (GIF 변형) ----------

// GIF LZW: 코드 폭은 minCodeSize+1에서 시작해 12비트까지 늘고,
// 사전이 가득 차면 Clear 코드를 내보내고 초기화한다. 비트는 LSB부터 채운다.
function lzwEncode(indices, minCodeSize) {
  const out = [];
  let cur = 0;      // 아직 못 내보낸 비트
  let curBits = 0;

  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let next = eoiCode + 1;
  let dict = new Map();

  const emit = (code) => {
    cur |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      out.push(cur & 0xff);
      cur >>= 8;
      curBits -= 8;
    }
  };
  const reset = () => {
    dict = new Map();
    codeSize = minCodeSize + 1;
    next = eoiCode + 1;
  };

  emit(clearCode);
  reset();

  let prefix = indices.length ? indices[0] : -1;
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 4096 + k; // (prefix, k) → 정수 키
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      // 폭 확장 시점: 인코더 사전은 디코더보다 항상 한 항목 앞서 있다
      // (디코더는 다음 코드를 읽을 때 비로소 항목을 추가한다).
      // 그래서 `next === 1<<codeSize`가 아니라 그 다음 항목에서 넓혀야 맞물린다.
      if (next > (1 << codeSize) && codeSize < 12) codeSize++;
    } else {
      emit(clearCode);
      reset();
    }
    prefix = k;
  }
  if (prefix !== -1) emit(prefix);
  emit(eoiCode);

  if (curBits > 0) out.push(cur & 0xff);
  return out;
}

// LZW 결과를 255바이트 이하 서브블록으로 쪼개 쓴다(GIF 규격).
function writeSubBlocks(w, data) {
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.slice(i, i + 255);
    w.byte(chunk.length);
    w.bytes(Uint8Array.from(chunk));
  }
  w.byte(0); // 블록 종료
}

// ---------- 인코딩 ----------

// frames: 셀별 hex|null 픽셀 배열 목록 (App의 프레임 형식 그대로).
// opts: { scale=1, fps=8, loop=0 }  loop 0 = 무한 반복.
// 반환: Uint8Array (GIF 바이트).
//
// 색이 255개(투명 1칸 제외)를 넘으면 담을 수 없으므로 예외를 던진다 —
// 픽셀아트에서는 사실상 일어나지 않지만, 조용히 뭉개지 않고 알린다.
export function encodeGifBytes(frames, size, { scale = 1, fps = 8, loop = 0 } = {}) {
  if (!Array.isArray(frames) || !frames.length) throw new Error("프레임이 없습니다.");
  const s = Math.max(1, Math.floor(scale));
  const W = size * s, H = size * s;

  // 1) 전역 팔레트 — 0번은 투명 전용.
  const colorIndex = new Map();
  const colors = [];
  for (const px of frames) {
    for (const c of px) {
      if (!c || colorIndex.has(c)) continue;
      colorIndex.set(c, colors.length + 1); // 0번 예약
      colors.push(c);
    }
  }
  if (colors.length > 255) throw new Error("색이 255개를 넘어 GIF로 담을 수 없습니다.");

  const gctSize = tableSize(colors.length + 1);
  const minCodeSize = Math.max(2, tableBits(gctSize) + 1);

  const w = createWriter();
  w.ascii("GIF89a");
  // Logical Screen Descriptor
  w.short(W);
  w.short(H);
  w.byte(0x80 | tableBits(gctSize)); // 전역 색 테이블 사용
  w.byte(0);                          // 배경색 인덱스(투명)
  w.byte(0);                          // 픽셀 종횡비 미지정

  // Global Color Table — 0번은 투명 자리(값은 무의미하므로 검정).
  w.bytes(new Uint8Array([0, 0, 0]));
  for (let i = 0; i < gctSize - 1; i++) {
    const hex = colors[i];
    if (hex) {
      w.byte(parseInt(hex.slice(1, 3), 16));
      w.byte(parseInt(hex.slice(3, 5), 16));
      w.byte(parseInt(hex.slice(5, 7), 16));
    } else {
      w.bytes(new Uint8Array([0, 0, 0])); // 남는 칸 패딩
    }
  }

  // Netscape Application Extension — 반복 횟수. 프레임이 1개면 생략.
  if (frames.length > 1) {
    w.byte(0x21); w.byte(0xff); w.byte(11);
    w.ascii("NETSCAPE2.0");
    w.byte(3); w.byte(1); w.short(loop); w.byte(0);
  }

  // 프레임 지연은 1/100초 단위. fps로 환산하되 최소 2(=20ms, 브라우저 하한).
  const delay = Math.max(2, Math.round(100 / (fps > 0 ? fps : 8)));

  for (const px of frames) {
    // Graphic Control Extension — 처분 2(배경 복원) + 투명 인덱스 0.
    w.byte(0x21); w.byte(0xf9); w.byte(4);
    w.byte((2 << 2) | 0x01);
    w.short(delay);
    w.byte(0);  // 투명 색 인덱스
    w.byte(0);

    // Image Descriptor
    w.byte(0x2c);
    w.short(0); w.short(0);
    w.short(W); w.short(H);
    w.byte(0); // 지역 색 테이블 없음, 인터레이스 아님

    // 인덱스 픽셀 (정수배 확대는 셀 복제)
    const idx = new Uint8Array(W * H);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const c = px[y * size + x];
        const v = c ? colorIndex.get(c) : 0;
        for (let dy = 0; dy < s; dy++) {
          const row = (y * s + dy) * W + x * s;
          for (let dx = 0; dx < s; dx++) idx[row + dx] = v;
        }
      }
    }

    w.byte(minCodeSize);
    writeSubBlocks(w, lzwEncode(idx, minCodeSize));
  }

  w.byte(0x3b); // Trailer
  return w.result();
}

// 브라우저에서 바로 저장/미리보기 할 수 있는 Blob.
export function encodeGif(frames, size, opts) {
  return new Blob([encodeGifBytes(frames, size, opts)], { type: "image/gif" });
}
