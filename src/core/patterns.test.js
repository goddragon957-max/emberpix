import assert from "node:assert/strict";
import test from "node:test";

import { BUILTIN_PATTERNS } from "./patterns.js";

const SIZES = [16, 32, 64];
const NEW_PATTERN_NAMES = ["무지개", "로켓", "고양이"];

test("새 내장 도안은 목록에 포함된다", () => {
  const names = BUILTIN_PATTERNS.map((pattern) => pattern.name);
  for (const name of NEW_PATTERN_NAMES) assert.ok(names.includes(name), `${name} 도안이 필요합니다.`);
});

test("모든 내장 도안은 16·32·64에서 가장자리 없이 그려진다", () => {
  for (const pattern of BUILTIN_PATTERNS) {
    for (const size of SIZES) {
      const pixels = pattern.make(size);
      assert.equal(pixels.length, size * size, `${pattern.name} ${size} 크기`);
      assert.ok(pixels.some(Boolean), `${pattern.name} ${size} 크기에 색칠할 칸이 필요합니다.`);

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (!pixels[y * size + x]) continue;
          assert.notEqual(x, 0, `${pattern.name} ${size}이 왼쪽에 닿았습니다.`);
          assert.notEqual(y, 0, `${pattern.name} ${size}이 위쪽에 닿았습니다.`);
          assert.notEqual(x, size - 1, `${pattern.name} ${size}이 오른쪽에 닿았습니다.`);
          assert.notEqual(y, size - 1, `${pattern.name} ${size}이 아래쪽에 닿았습니다.`);
        }
      }
    }
  }
});
