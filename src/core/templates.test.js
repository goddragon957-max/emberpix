import assert from "node:assert/strict";
import test from "node:test";

import { TEMPLATES, templateToReference } from "./templates.js";

const SIZES = [16, 32, 64];

test("그림 그리기 내장 도안은 정확히 20개이며 이름이 겹치지 않는다", () => {
  assert.equal(TEMPLATES.length, 20);
  assert.equal(new Set(TEMPLATES.map((template) => template.name)).size, 20);
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
