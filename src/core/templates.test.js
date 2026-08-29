import assert from "node:assert/strict";
import test from "node:test";

import { TEMPLATES, templateToReference } from "./templates.js";

const SIZES = [16, 32, 64];
const TEMPLATE_NAMES = ["병아리", "물고기", "나비", "강아지", "고양이", "토끼", "곰", "개구리", "거북이", "공룡", "사과", "딸기", "버섯", "컵케이크", "해님", "초승달", "구름", "집", "자동차", "로봇"];
const REDRAW_NAMES = [
  "토끼",
  "곰",
  "개구리",
  "거북이",
  "공룡",
  "사과",
  "딸기",
  "버섯",
  "컵케이크",
  "해님",
  "초승달",
  "구름",
  "집",
  "자동차",
  "로봇",
];

function hasClosedFillArea(rows) {
  const size = rows.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const stack = [];

  const pushIfBackground = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    if (visited[y][x] || rows[y][x] !== ".") return;
    visited[y][x] = true;
    stack.push([x, y]);
  };

  for (let i = 0; i < size; i += 1) {
    pushIfBackground(i, 0);
    pushIfBackground(i, size - 1);
    pushIfBackground(0, i);
    pushIfBackground(size - 1, i);
  }

  while (stack.length) {
    const [x, y] = stack.pop();
    pushIfBackground(x + 1, y);
    pushIfBackground(x - 1, y);
    pushIfBackground(x, y + 1);
    pushIfBackground(x, y - 1);
  }

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (rows[y][x] === "." && !visited[y][x]) return true;
    }
  }

  return false;
}

test("그림 그리기 내장 도안은 정확히 20개이며 이름이 겹치지 않는다", () => {
  assert.equal(TEMPLATES.length, 20);
  assert.equal(new Set(TEMPLATES.map((template) => template.name)).size, 20);
  assert.deepEqual(TEMPLATES.map((template) => template.name), TEMPLATE_NAMES);
});

test("모든 그림 도안은 16×16 라인아트 형식을 지킨다", () => {
  for (const template of TEMPLATES) {
    assert.equal(template.rows.length, 16, `${template.name} 행 개수`);
    assert.ok(template.rows.some((row) => row.includes("#")), `${template.name}에 윤곽선이 필요합니다.`);
    for (const row of template.rows) {
      assert.equal(row.length, 16, `${template.name} 열 개수`);
      assert.match(row, /^[.#]+$/, `${template.name}에는 .과 #만 사용할 수 있습니다.`);
    }
  }
});

test("모든 그림 도안은 16·32·64 참조 배열로 안전하게 확대된다", () => {
  for (const template of TEMPLATES) {
    for (const size of SIZES) {
      const reference = templateToReference(template, size);
      assert.equal(reference.length, size * size, `${template.name} ${size} 크기`);
      assert.ok(reference.includes(45), `${template.name} ${size} 크기에 윤곽선이 필요합니다.`);
      assert.ok(reference.every((value) => value === 45 || value === 255), `${template.name} 밝기 값`);
    }
  }
});

test("신규 15개 그림 도안은 16×16에서 바깥 여백 한 칸을 유지한다", () => {
  for (const name of REDRAW_NAMES) {
    const template = TEMPLATES.find((item) => item.name === name);
    assert.ok(template, `${name} 도안이 필요합니다.`);

    for (let index = 0; index < 16; index += 1) {
      assert.equal(template.rows[0][index], ".", `${name} 위쪽 여백`);
      assert.equal(template.rows[15][index], ".", `${name} 아래쪽 여백`);
      assert.equal(template.rows[index][0], ".", `${name} 왼쪽 여백`);
      assert.equal(template.rows[index][15], ".", `${name} 오른쪽 여백`);
    }
  }
});

test("신규 15개 그림 도안은 색칠 가능한 폐쇄 영역을 가진다", () => {
  for (const name of REDRAW_NAMES) {
    const template = TEMPLATES.find((item) => item.name === name);
    assert.ok(template, `${name} 도안이 필요합니다.`);
    assert.ok(hasClosedFillArea(template.rows), `${name} 내부 색칠 면`);
  }
});
