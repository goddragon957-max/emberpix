import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { qualityArgs, launchQualityBrowser, observePage } from "./quality-runtime.mjs";
import { TEMPLATES, templateToReference } from "../src/core/templates.js";
import { BUILTIN_PATTERNS } from "../src/core/patterns.js";

const args = qualityArgs({ probe: { type: "boolean", default: false } });
const deployment = new URL(args.url).pathname === "/" ? "root" : "pages";
const browser = await launchQualityBrowser(args);
const results = [];
await mkdir(args.out, { recursive: true });
try {
  for (const [width, height] of [[360, 800], [390, 844], [844, 390], [1280, 800]]) {
    for (const mode of ["draw", "gem"]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const errors = observePage(page);
      await page.goto(args.url);
      await page.getByTestId(`new-work-${mode}`).click();
      await page.getByRole("button", { name: /더보기 —/ }).click();
      const trigger = page.getByRole("button", { name: "도안 전체보기", exact: true });
      assert.equal(await trigger.count(), 1, `${mode} 전체보기 버튼`);
      const canvas = page.getByTestId("editor-canvas");
      const before = await canvas.boundingBox();
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      const items = dialog.getByRole("button", { name: /도안 선택$/ });
      assert.equal(await items.count(), 20);
      const names = (mode === "draw" ? TEMPLATES : BUILTIN_PATTERNS).map((entry) => entry.name);
      assert.deepEqual(await items.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label"))), names.map((n) => `${n} 도안 선택`));
      assert.deepEqual(await canvas.boundingBox(), before, "모달을 열어도 캔버스 크기와 위치 유지");
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1);
      await page.screenshot({ path: path.join(args.out, `gallery-open-${deployment}-${mode}-${width}x${height}.png`) });
      for (let i = 0; i < 23; i++) {
        await page.keyboard.press("Tab");
        assert.equal(await dialog.evaluate((node) => node.contains(document.activeElement)), true, "Tab 포커스는 모달 안에 유지");
      }
      await dialog.getByRole("button", { name: "도안 전체보기 닫기" }).focus();
      await page.keyboard.press("Shift+Tab");
      assert.equal(await items.last().evaluate((node) => node === document.activeElement), true);
      await page.keyboard.press("Escape");
      assert.equal(await dialog.count(), 0);
      assert.equal(await trigger.evaluate((node) => node === document.activeElement), true, "닫은 뒤 원래 버튼으로 복귀");

      await trigger.click();
      await dialog.getByRole("button", { name: `${names[19]} 도안 선택`, exact: true }).click();
      await page.waitForFunction(({ mode, expected }) => {
        const saved = JSON.parse(localStorage.getItem("emberpix:autosave:v2") || "null");
        return JSON.stringify(saved?.[mode === "draw" ? "reference" : "pattern"]) === JSON.stringify(expected);
      }, { mode, expected: mode === "draw" ? templateToReference(TEMPLATES[19], 32) : BUILTIN_PATTERNS[19].make(32) });
      await trigger.click();
      assert.equal(await items.last().getAttribute("aria-pressed"), "true", "현재 도안 선택 표시");
      if (mode === "draw") {
        const pen = page.getByTitle("펜 (B)", { exact: true });
        const penStyle = await pen.getAttribute("style");
        await page.keyboard.press("e");
        assert.equal(await pen.getAttribute("style"), penStyle, "모달 뒤 도구 단축키 차단");
      }
      await items.last().scrollIntoViewIfNeeded();
      const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY, width: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.deepEqual(scroll, { x: 0, y: 0, width, viewport: width });
      await page.screenshot({ path: path.join(args.out, `gallery-${deployment}-${mode}-${width}x${height}.png`) });
      await page.keyboard.press("Escape");

      if (mode === "draw") {
        await trigger.click();
        await items.first().focus();
        await page.keyboard.press("Enter");
        assert.equal(await dialog.count(), 0, "Enter 도안 선택");
        await trigger.click();
        await items.nth(1).focus();
        await page.keyboard.press("Space");
        assert.equal(await dialog.count(), 0, "Space 도안 선택");
      } else {
        await trigger.click();
        await items.first().click();
        await page.getByTestId("destructive-cancel").click();
        assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("emberpix:autosave:v2")));
        assert.deepEqual(saved.pattern, BUILTIN_PATTERNS[19].make(32), "도안 변경 취소 시 기존 도안 보존");
      }
      assert.deepEqual(errors, []);
      results.push({ mode, width, height, count: 20, keyboard: "pass", focus: "pass", noPageScroll: true, errors });
      await context.close();
    }
  }
  await writeFile(path.join(args.out, `gallery-${deployment}-results.json`), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
