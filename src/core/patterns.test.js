import assert from "node:assert/strict";
import test from "node:test";

import { BUILTIN_PATTERNS } from "./patterns.js";

const SIZES = [16, 32, 64];
const PATTERN_NAMES = ["하트", "별", "꽃", "무지개", "로켓", "고양이", "해님", "초승달", "구름", "나무", "집", "물고기", "나비", "버섯", "사과", "체리", "컵케이크", "왕관", "공룡", "로봇"];
const NEW_PATTERN_NAMES = ["무지개", "로켓", "고양이"];
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const TARGETED_PATTERN_FIXTURES = [
  {
    name: "해님",
    palette: {
      "1": "#ffcd75",
      "2": "#ef7d57",
    },
    rows: [
      "................",
      ".......1........",
      "....1..1..1.....",
      ".....122221.....",
      "...1122222211...",
      "...1222222221...",
      ".11122222222111.",
      "..122222222221..",
      "..122222222221..",
      ".11122222222111.",
      "...1222222221...",
      "...1122222211...",
      ".....122221.....",
      "....1..1..1.....",
      ".......1........",
      "................",
    ],
  },
  {
    name: "구름",
    palette: {
      "1": "#e8f4ff",
      "2": "#41a6f6",
    },
    rows: [
      "................",
      "................",
      "................",
      "......11........",
      "....111111......",
      "..1112222111....",
      ".122222222211...",
      ".1222222222221..",
      ".12222222222221.",
      ".12222222222221.",
      "..112222222221..",
      "....111111111...",
      "................",
      "................",
      "................",
      "................",
    ],
  },
  {
    name: "집",
    palette: {
      "1": "#ef7d57",
      "2": "#b13e53",
      "3": "#fff1b8",
      "4": "#8f563b",
    },
    rows: [
      "................",
      "................",
      ".......1........",
      "......111.......",
      ".....11111......",
      "....1111111.....",
      "...111111111....",
      "..11222222211...",
      ".1222222222221..",
      ".1222332233221..",
      ".1222332233221..",
      ".1222224422221..",
      ".1222224422221..",
      ".1222224422221..",
      ".1111111111111..",
      "................",
    ],
  },
  {
    name: "물고기",
    palette: {
      "1": "#41a6f6",
      "2": "#73eff7",
      "3": "#29366f",
      "4": "#ffcd75",
    },
    rows: [
      "................",
      "................",
      "................",
      "...........4....",
      ".........1121...",
      ".....11.122221..",
      "...112222222221.",
      "..1222222222231.",
      ".12222222222221.",
      "..1222222222231.",
      "...1144.222221..",
      ".....11.122221..",
      ".........1121...",
      "...........4....",
      "................",
      "................",
    ],
  },
  {
    name: "공룡",
    palette: {
      "1": "#a7f070",
      "2": "#38b764",
      "3": "#8f563b",
      "4": "#29366f",
    },
    rows: [
      "................",
      "................",
      "..........11....",
      "........11221...",
      ".......122221...",
      "...11112222221..",
      "..122222222221..",
      ".122222222221...",
      ".12222222221....",
      ".12222422221....",
      ".12222222111....",
      "..12222221......",
      "...113311.......",
      "...13..31.......",
      "................",
      "................",
    ],
  },
  {
    name: "로봇",
    palette: {
      "1": "#73eff7",
      "2": "#e8f4ff",
      "3": "#29366f",
      "4": "#8f563b",
    },
    rows: [
      "................",
      ".......1........",
      ".......4........",
      ".....11111......",
      "....1222221.....",
      "...122333221....",
      "...123232321....",
      "...122333221....",
      "...122222221....",
      "....1122211.....",
      "...144444441....",
      "..1441221441....",
      "..14..11..41....",
      "..44..11..44....",
      "................",
      "................",
    ],
  },
];

function renderExpectedPattern(rows, palette, size) {
  assert.equal(rows.length, 16, "fixture는 16행이어야 합니다.");
  rows.forEach((row) => assert.equal(row.length, 16, "fixture 각 행은 16칸이어야 합니다."));

  const out = new Array(size * size).fill(null);
  const sourceSize = rows.length;

  for (let y = 0; y < size; y += 1) {
    const sy = Math.floor((y * sourceSize) / size);
    for (let x = 0; x < size; x += 1) {
      const sx = Math.floor((x * sourceSize) / size);
      const symbol = rows[sy][sx];
      out[y * size + x] = symbol === "." ? null : palette[symbol];
    }
  }

  return out;
}

test("새 내장 도안은 목록에 포함된다", () => {
  const names = BUILTIN_PATTERNS.map((pattern) => pattern.name);
  for (const name of NEW_PATTERN_NAMES) assert.ok(names.includes(name), `${name} 도안이 필요합니다.`);
});

test("보석십자수 내장 도안은 정확히 20개이며 이름이 겹치지 않는다", () => {
  assert.equal(BUILTIN_PATTERNS.length, 20);
  assert.equal(new Set(BUILTIN_PATTERNS.map((pattern) => pattern.name)).size, 20);
  assert.deepEqual(BUILTIN_PATTERNS.map((pattern) => pattern.name), PATTERN_NAMES);
});

test("수정 대상 6개 보석 도안은 16 원본과 32·64 정수 배율을 유지한다", () => {
  for (const fixture of TARGETED_PATTERN_FIXTURES) {
    const pattern = BUILTIN_PATTERNS.find((candidate) => candidate.name === fixture.name);
    assert.ok(pattern, `${fixture.name} 도안이 필요합니다.`);

    for (const size of SIZES) {
      assert.deepEqual(
        pattern.make(size),
        renderExpectedPattern(fixture.rows, fixture.palette, size),
        `${fixture.name} ${size} 출력이 기대한 실루엣과 다릅니다.`,
      );
    }
  }
});

test("모든 내장 도안은 16·32·64에서 가장자리 없이 그려진다", () => {
  for (const pattern of BUILTIN_PATTERNS) {
    for (const size of SIZES) {
      const pixels = pattern.make(size);
      assert.equal(pixels.length, size * size, `${pattern.name} ${size} 크기`);
      assert.ok(pixels.some(Boolean), `${pattern.name} ${size} 크기에 색칠할 칸이 필요합니다.`);
      assert.ok(
        pixels.every((value) => value === null || HEX_COLOR_RE.test(value)),
        `${pattern.name} ${size} 색상 값`,
      );

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
