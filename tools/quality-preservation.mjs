import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const sourceUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const baseline = async (file) => import(sourceUrl(execFileSync("git", ["show", `d1095f2:${file}`], { encoding: "utf8" })));
const beforeTemplates = await baseline("src/core/templates.js");
const beforePatterns = await baseline("src/core/patterns.js");
const currentTemplates = await import(pathToFileURL(path.resolve("src/core/templates.js")).href);
const currentPatterns = await import(pathToFileURL(path.resolve("src/core/patterns.js")).href);
const changedDraw = new Set(currentTemplates.TEMPLATES.slice(5).map((entry) => entry.name));
const changedGem = new Set(["해님", "구름", "집", "물고기", "공룡", "로봇"]);
const results = [];

assert.deepEqual(currentTemplates.TEMPLATES.map((entry) => entry.name), beforeTemplates.TEMPLATES.map((entry) => entry.name));
assert.deepEqual(currentPatterns.BUILTIN_PATTERNS.map((entry) => entry.name), beforePatterns.BUILTIN_PATTERNS.map((entry) => entry.name));
for (let index = 0; index < 20; index += 1) {
  const name = currentTemplates.TEMPLATES[index].name;
  if (!changedDraw.has(name)) assert.deepEqual(currentTemplates.TEMPLATES[index].rows, beforeTemplates.TEMPLATES[index].rows, `${name} 그림 기준선 보존`);
  results.push({ kind: "draw", name, changed: changedDraw.has(name), preserved: !changedDraw.has(name) });
}
for (let index = 0; index < 20; index += 1) {
  const name = currentPatterns.BUILTIN_PATTERNS[index].name;
  for (const size of [16, 32, 64]) {
    if (!changedGem.has(name)) assert.deepEqual(currentPatterns.BUILTIN_PATTERNS[index].make(size), beforePatterns.BUILTIN_PATTERNS[index].make(size), `${name} 보석 ${size} 기준선 보존`);
  }
  results.push({ kind: "gem", name, changed: changedGem.has(name), preserved: !changedGem.has(name) });
}
await writeFile("docs/quality/evidence/preservation.json", JSON.stringify({ baseline: "d1095f2", results, status: "pass" }, null, 2));
console.log(JSON.stringify({ status: "pass", unchanged: results.filter((entry) => entry.preserved).length, changed: results.filter((entry) => entry.changed).length }));
