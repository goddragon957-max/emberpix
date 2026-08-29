const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function fail(message) {
  throw new Error(message);
}

function validateRows(name, rows, { expectedHeight, expectedWidth, allowedChars, label }) {
  if (!Array.isArray(rows)) {
    fail(`${name} ${label} 행은 배열이어야 합니다.`);
  }

  if (rows.length !== expectedHeight) {
    fail(`${name} ${label} 행 개수는 ${expectedHeight}이어야 합니다.`);
  }

  let filledCellCount = 0;

  rows.forEach((row, rowIndex) => {
    if (typeof row !== "string") {
      fail(`${name} ${rowIndex + 1}번째 행은 문자열이어야 합니다.`);
    }

    if (row.length !== expectedWidth) {
      fail(`${name} ${rowIndex + 1}번째 행 열 개수는 ${expectedWidth}이어야 합니다.`);
    }

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const cell = row[columnIndex];
      if (!allowedChars.has(cell)) {
        fail(
          `${name} ${rowIndex + 1}번째 행 ${columnIndex + 1}번째 칸에 허용되지 않은 문자 '${cell}'가 있습니다.`,
        );
      }

      if (cell !== ".") {
        filledCellCount += 1;
      }
    }
  });

  if (filledCellCount === 0) {
    fail(`${name} ${label}에는 최소 한 칸 이상의 도형이 필요합니다.`);
  }

  return rows;
}

function validatePalette(name, palette) {
  if (!palette || typeof palette !== "object" || Array.isArray(palette)) {
    fail(`${name} 팔레트는 문자-색상 객체여야 합니다.`);
  }

  const entries = Object.entries(palette);
  if (entries.length === 0) {
    fail(`${name} 팔레트에는 최소 한 개 이상의 색이 필요합니다.`);
  }

  for (const [symbol, color] of entries) {
    if (symbol.length !== 1) {
      fail(`${name} 팔레트 키 '${symbol}'는 한 글자여야 합니다.`);
    }

    if (typeof color !== "string" || !HEX_COLOR_RE.test(color)) {
      fail(`${name} 팔레트 색상 '${String(color)}'는 #RRGGBB 형식이어야 합니다.`);
    }
  }

  return palette;
}

export function validateTemplateRows(name, rows) {
  return validateRows(name, rows, {
    expectedHeight: 16,
    expectedWidth: 16,
    allowedChars: new Set([".", "#"]),
    label: "그림 도안",
  });
}

export function validatePixelTemplateSource(name, rows) {
  return validateRows(name, rows, {
    expectedHeight: 8,
    expectedWidth: 8,
    allowedChars: new Set([".", "#"]),
    label: "그림 도안 원본",
  });
}

export function validateScaledTemplateSource(name, template, palette, options = {}) {
  if (typeof template !== "string") {
    fail(`${name} 보석 템플릿 원본은 문자열이어야 합니다.`);
  }

  const expectedWidth = options.expectedWidth ?? 8;
  const expectedHeight = options.expectedHeight ?? expectedWidth;
  const label = options.label ?? "보석 템플릿";
  const rows = template.replace(/\r/g, "").trim().split("\n");
  const validatedPalette = validatePalette(name, palette);
  const allowedChars = new Set([".", ...Object.keys(validatedPalette)]);

  return {
    rows: validateRows(name, rows, {
      expectedHeight,
      expectedWidth,
      allowedChars,
      label,
    }),
    width: expectedWidth,
    height: expectedHeight,
    palette: validatedPalette,
  };
}
