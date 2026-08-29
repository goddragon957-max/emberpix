import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { qualityArgs, launchQualityBrowser, observePage } from "./quality-runtime.mjs";
import { BUILTIN_PATTERNS } from "../src/core/patterns.js";
import { TEMPLATES, templateToReference } from "../src/core/templates.js";

const args = qualityArgs({ only: { type: "string", default: "ABCEI" } });
const KEY = "emberpix:autosave:v2";
const reports = [];
const browser = await launchQualityBrowser(args);
let currentPage;
await mkdir(args.out, { recursive: true });
function fixture(mode = "draw") {
  return { version: 2, size: 16, frames: [Array(256).fill(null)], currentFrame: 0, color: "#ef7d57",
    reference: null, refOpacity: 1, pattern: null, palettes: { user: [], active: 0, recent: [] }, mode };
}
async function session(state = fixture()) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await context.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: KEY, state });
  const page = await context.newPage();
  currentPage = page;
  const errors = observePage(page);
  await page.goto(args.url);
  await page.getByRole("button", { name: state.mode === "gem" ? /^보석십자수/ : /^그림 그리기/ }).first().click();
  return { context, page, errors };
}
async function saved(page) { return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY); }
async function waitSaved(page, expected) {
  await page.waitForFunction(({ key, expected }) => {
    const value = JSON.parse(localStorage.getItem(key));
    return value && Object.entries(expected).every(([field, wanted]) => JSON.stringify(value[field]) === JSON.stringify(wanted));
  }, { key: KEY, expected }, { timeout: 5000 });
  return saved(page);
}
async function more(page) {
  if (!await page.getByTestId("canvas-size-select").count()) await page.getByRole("button", { name: /더보기 —/ }).click();
}
async function closeMore(page) { await page.getByRole("button", { name: "닫기", exact: true }).click(); }
async function point(page, x, y, size = 16) {
  const rect = await page.getByTestId("editor-canvas").boundingBox();
  return { x: rect.x + (x + 0.5) * rect.width / size, y: rect.y + (y + 0.5) * rect.height / size };
}
async function tap(page, x, y) { const p = await point(page, x, y); await page.touchscreen.tap(p.x, p.y); }
async function applyDesign(page, name) {
  await more(page);
  await page.getByRole("button", { name: "도안 전체보기", exact: true }).click();
  await page.getByRole("button", { name: `${name} 도안 선택`, exact: true }).click();
  await closeMore(page);
}
async function saveLibrary(page, name) {
  await more(page);
  await page.getByTestId("library-save").click();
  await page.getByTestId("library-name").fill(name);
  await page.getByTestId("library-save-primary").click();
  await page.getByTestId("editor-canvas").waitFor({ state: "visible" });
}
async function run(label, fn) {
  if (!args.only.includes(label)) return;
  try { await fn(); } catch (error) {
    if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: path.join(args.out, `failure-${label}.png`) });
    reports.push({ scenario: label, status: "fail", message: error.message });
    throw error;
  }
  reports.push({ scenario: label, status: "pass" });
  console.log(`${label}: pass`);
}
try {
  await run("A", async () => {
    const { context, page, errors } = await session();
    await applyDesign(page, "고양이");
    await tap(page, 8, 8);
    const expected = Array(256).fill(null); expected[136] = "#ef7d57";
    await waitSaved(page, { frames: [expected], reference: templateToReference(TEMPLATES[4], 16) });
    await page.keyboard.press("Control+z");
    await waitSaved(page, { frames: [Array(256).fill(null)] });
    await page.keyboard.press("Control+Shift+z");
    await waitSaved(page, { frames: [expected] });
    await page.keyboard.press("e"); await tap(page, 8, 8);
    await waitSaved(page, { frames: [Array(256).fill(null)] });
    await page.keyboard.press("Control+z");
    await waitSaved(page, { frames: [expected] });
    await page.keyboard.press("i"); await tap(page, 8, 8);
    await waitSaved(page, { color: "#ef7d57" });
    await page.keyboard.press("g"); await tap(page, 7, 8);
    await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).frames[0].filter(Boolean).length > 1, KEY);
    const filled = await saved(page);
    assert.equal(filled.frames[0][0], null, "밑그림 밖으로 채우기 누수 없음");
    await page.keyboard.press("b");
    await page.reload();
    await page.getByRole("button", { name: /^그림 그리기/ }).first().click();
    assert.deepEqual((await saved(page)).frames, filled.frames);
    await page.screenshot({ path: path.join(args.out, "flow-A-draw-restored.png") });
    assert.deepEqual(errors, []);
    await context.close();
  });

  await run("B", async () => {
    const { context, page, errors } = await session(fixture("gem"));
    await applyDesign(page, "하트");
    const pattern = BUILTIN_PATTERNS[0].make(16);
    const cells = pattern.flatMap((color, i) => color ? [i] : []).slice(0, 2);
    await tap(page, cells[0] % 16, Math.floor(cells[0] / 16));
    const pixels = Array(256).fill(null); pixels[cells[0]] = pattern[cells[0]];
    await waitSaved(page, { frames: [pixels] });
    const cdp = await context.newCDPSession(page);
    const penPoint = await point(page, cells[1] % 16, Math.floor(cells[1] / 16));
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", ...penPoint, button: "left", clickCount: 1, pointerType: "pen", force: 0.9 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...penPoint, button: "left", clickCount: 1, pointerType: "pen" });
    pixels[cells[1]] = pattern[cells[1]];
    await waitSaved(page, { frames: [pixels] });
    assert.equal(pixels.filter(Boolean).length, 2, "터치와 강한 펜 입력이 각각 한 칸씩만 변경");
    await page.keyboard.press("Control+z");
    const one = pixels.slice(); one[cells[1]] = null;
    await waitSaved(page, { frames: [one] });
    await page.keyboard.press("Control+Shift+z"); await waitSaved(page, { frames: [pixels] });
    await saveLibrary(page, "QA 보석 저장");
    assert.equal(await page.getByTestId("editor-canvas").evaluate((canvas) => canvas.width), 640, "저장 뒤 편집 캔버스 재렌더");
    await page.reload();
    await page.getByTestId("library-open").click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator('[data-testid^="library-item-"]').first().getByRole("button", { name: "열기", exact: true }).click();
    await waitSaved(page, { frames: [pixels], pattern, mode: "gem" });
    assert.equal(await page.getByTestId("editor-canvas").evaluate((canvas) => canvas.width), 640);
    await page.screenshot({ path: path.join(args.out, "flow-B-gem-library.png") });
    assert.deepEqual(errors, []);
    await context.close();
  });

  await run("C", async () => {
    const original = fixture("gem");
    original.frames[0][20] = "#41a6f6";
    original.frames.push(Array(256).fill(null)); original.frames[1][35] = "#ffcd75";
    original.currentFrame = 1;
    original.reference = templateToReference(TEMPLATES[4], 16); original.refOpacity = 0.7;
    original.pattern = BUILTIN_PATTERNS[0].make(16);
    original.palettes = { user: [{ name: "QA 색", colors: ["#41a6f6", "#ffcd75"] }], active: 1, recent: ["#ffcd75"] };
    const source = await session(original);
    await more(source.page);
    const downloadEvent = source.page.waitForEvent("download");
    await source.page.getByTitle("프로젝트 파일로 저장 — 프레임·팔레트·밑그림 포함").click();
    const download = await downloadEvent;
    const bytes = await readFile(await download.path());
    const destination = await session();
    await more(destination.page);
    await destination.page.locator('input[accept=".emberpix,application/json"]').setInputFiles({ name: "QA.emberpix", mimeType: "application/json", buffer: bytes });
    const { version, ...fields } = original;
    const restored = await waitSaved(destination.page, fields);
    for (const [key, value] of Object.entries(fields)) assert.deepEqual(restored[key], value, key);
    assert.deepEqual(source.errors, []); assert.deepEqual(destination.errors, []);
    await source.context.close(); await destination.context.close();
  });

  await run("E", async () => {
    const initial = fixture(); initial.frames[0][17] = "#ef7d57";
    const { context, page, errors } = await session(initial);
    await saveLibrary(page, "QA 기존 작품");
    if (await page.getByTestId("canvas-size-select").count()) await closeMore(page);
    const oldRecords = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((key) => key.startsWith("emberpix:")).map((key) => [key, localStorage.getItem(key)])));
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith("emberpix:")) throw new DOMException("QA quota", "QuotaExceededError");
        return original.call(this, key, value);
      };
    });
    await tap(page, 8, 8);
    await page.getByRole("alert").waitFor({ state: "visible", timeout: 5000 });
    assert.match(await page.getByRole("alert").innerText(), /자동저장/);
    const backup = page.waitForEvent("download");
    await page.getByRole("button", { name: "파일로 백업", exact: true }).click();
    const backupData = JSON.parse(await readFile(await (await backup).path(), "utf8"));
    assert.equal(backupData.frames[0][136], "#ef7d57", "실패 이후 메모리의 최신 그림 백업");
    const records = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((key) => key.startsWith("emberpix:")).map((key) => [key, localStorage.getItem(key)])));
    assert.deepEqual(records, oldRecords, "quota 때 기존 자동저장과 보관함 보존");
    await page.screenshot({ path: path.join(args.out, "flow-E-quota-backup.png") });
    assert.deepEqual(errors, []);
    await context.close();

    const safe = await session(initial);
    await more(safe.page);
    await safe.page.locator('input[accept=".emberpix,application/json"]').setInputFiles({ name: "broken.emberpix", mimeType: "application/json", buffer: Buffer.from("{broken}") });
    await safe.page.getByText(/불러오기 실패/).waitFor();
    assert.deepEqual((await saved(safe.page)).frames, initial.frames);
    await safe.page.getByTestId("clear-canvas").click();
    await safe.page.keyboard.press("Escape");
    assert.deepEqual((await saved(safe.page)).frames, initial.frames);
    await safe.page.getByTestId("clear-canvas").click();
    await safe.page.getByTestId("destructive-confirm").click();
    await waitSaved(safe.page, { frames: [Array(256).fill(null)] });
    await safe.page.keyboard.press("Control+z"); await waitSaved(safe.page, { frames: initial.frames });
    await safe.page.getByTestId("canvas-size-select").selectOption("32");
    await safe.page.getByTestId("destructive-cancel").click();
    assert.equal((await saved(safe.page)).size, 16);
    await safe.page.getByTestId("canvas-size-select").selectOption("32");
    await safe.page.getByTestId("destructive-confirm").click();
    await waitSaved(safe.page, { size: 32, frames: [Array(1024).fill(null)] });
    assert.deepEqual(safe.errors, []); await safe.context.close();
  });

  await run("I", async () => {
    const initial = fixture(); initial.frames[0][17] = "#ef7d57"; initial.frames.push(Array(256).fill(null));
    const { context, page, errors } = await session(initial);
    await tap(page, 8, 8);
    const first = initial.frames[0].slice(); first[136] = "#ef7d57";
    await waitSaved(page, { frames: [first, initial.frames[1]] });
    await more(page);
    await page.getByTitle("프레임 2 (드래그로 순서 변경)", { exact: true }).click();
    await closeMore(page); await tap(page, 5, 5);
    await page.keyboard.press("Control+z");
    await waitSaved(page, { currentFrame: 1, frames: [first, initial.frames[1]] });
    const cdp = await context.newCDPSession(page);
    const p1 = await point(page, 5, 5), p2 = await point(page, 10, 10);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p1, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p1, id: 1 }, { ...p2, id: 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: p1.x - 10, y: p1.y - 10, id: 1 }, { x: p2.x + 10, y: p2.y + 10, id: 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [{ ...p1, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...p2, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitSaved(page, { frames: [first, initial.frames[1]] });
    assert.deepEqual(errors, []); await context.close();
  });
} finally {
  await writeFile(path.join(args.out, "flows-results.json"), JSON.stringify(reports, null, 2));
  await browser.close();
}
