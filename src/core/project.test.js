import assert from "node:assert/strict";
import test from "node:test";

import { parseProject } from "./project.js";

function makeFrame(size, color = null) {
  return Array.from({ length: size * size }, (_, index) => (index % (size + 1) === 0 ? color : null));
}

function makeProjectData() {
  const size = 16;
  return {
    app: "emberpix",
    version: 2,
    size,
    frames: [makeFrame(size, "#112233"), makeFrame(size, "#445566")],
    currentFrame: 1,
    color: "#ef7d57",
    palette: ["#ef7d57", "#ffcd75"],
    palettes: {
      user: [{ name: "따뜻한 색", colors: ["#ef7d57", "#ffcd75"] }],
      active: 1,
      recent: ["#ef7d57"],
    },
    reference: Array.from({ length: size * size }, (_, index) => (index === 0 ? 45 : 255)),
    refOpacity: 0.75,
    pattern: makeFrame(size, "#ffcd75"),
    mode: "gem",
  };
}

test(".emberpix v2는 프레임·현재 프레임·팔레트·밑그림·도안·모드를 그대로 복구한다", () => {
  const source = makeProjectData();

  assert.deepEqual(parseProject(JSON.stringify(source)), {
    size: source.size,
    frames: source.frames,
    currentFrame: source.currentFrame,
    color: source.color,
    reference: source.reference,
    refOpacity: source.refOpacity,
    pattern: source.pattern,
    palettes: source.palettes,
    mode: source.mode,
  });
});

test("legacy palette만 있는 .emberpix도 사용자 팔레트 슬롯으로 승격한다", () => {
  const source = makeProjectData();
  delete source.palettes;

  const parsed = parseProject(JSON.stringify(source));
  assert.deepEqual(parsed.palettes, {
    user: [{ name: "불러온 팔레트", colors: ["#ef7d57", "#ffcd75"] }],
    active: 1,
    recent: [],
  });
});

test("손상되었거나 app 태그가 다른 파일은 거부한다", () => {
  assert.equal(parseProject("{not-json}"), null);
  assert.equal(parseProject(JSON.stringify({ ...makeProjectData(), app: "other-app" })), null);
});

test("잘못된 frame 길이·pattern 형식은 조용히 통과하지 않는다", () => {
  const invalidFrames = { ...makeProjectData(), frames: [[null]] };
  assert.equal(parseProject(JSON.stringify(invalidFrames)), null);

  const invalidPattern = { ...makeProjectData(), pattern: [123] };
  const parsed = parseProject(JSON.stringify(invalidPattern));
  assert.equal(parsed, null);
});

test("명시된 밑그림 손상이나 알 수 없는 파일 버전은 현재 작업을 대체하지 않는다", () => {
  assert.equal(parseProject(JSON.stringify({ ...makeProjectData(), reference: [500] })), null);
  assert.equal(parseProject(JSON.stringify({ ...makeProjectData(), version: 999 })), null);
});
