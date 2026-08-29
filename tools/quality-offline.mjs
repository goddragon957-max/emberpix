import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { qualityArgs, launchQualityBrowser, observePage } from "./quality-runtime.mjs";

const args = qualityArgs();
const deployment = new URL(args.url).pathname === "/" ? "root" : "pages";
await mkdir(args.out, { recursive: true });
const browser = await launchQualityBrowser(args);
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const online = await context.newPage();
  const errors = observePage(online);
  await online.goto(args.url);
  await online.evaluate(async () => {
    if (!navigator.serviceWorker) throw new Error("서비스워커 미지원");
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("서비스워커 제어권 전환 시간 초과")), 5000);
      navigator.serviceWorker.addEventListener("controllerchange", () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  });
  const cached = await online.evaluate(async () => {
    const names = await caches.keys();
    const requests = [];
    for (const name of names.filter((entry) => entry.startsWith("emberpix-"))) {
      requests.push(...(await (await caches.open(name)).keys()).map((request) => request.url));
    }
    return requests;
  });
  assert.ok(cached.some((url) => /\/assets\/.*\.js$/.test(url)), "첫 방문 설치 중 JS 앱 셸을 캐시해야 합니다.");
  assert.ok(cached.some((url) => /\/assets\/.*\.css$/.test(url)), "첫 방문 설치 중 CSS 앱 셸을 캐시해야 합니다.");
  await online.close();
  await context.setOffline(true);
  const offline = await context.newPage();
  const failures = [];
  offline.on("requestfailed", (request) => failures.push({ url: request.url(), error: request.failure()?.errorText }));
  await offline.goto(args.url, { waitUntil: "domcontentloaded" });
  const offlineBody = await offline.locator("body").innerText();
  await offline.screenshot({ path: path.join(args.out, "offline-failure.png") });
  await writeFile(path.join(args.out, `offline-${deployment}-diagnostic.json`), JSON.stringify({ cached, failures, offlineBody }, null, 2));
  assert.equal(await offline.getByRole("button", { name: /^그림 그리기/ }).count(), 1, "첫 방문 뒤 오프라인 재열기에서 앱이 떠야 합니다.");
  await offline.screenshot({ path: path.join(args.out, `offline-${deployment}.png`) });
  await context.setOffline(false);
  await offline.reload();
  assert.equal(await offline.getByRole("button", { name: /^보석십자수/ }).count(), 1, "온라인 복귀 뒤 최신 앱 셸이 떠야 합니다.");
  assert.deepEqual(errors, []);
  await writeFile(path.join(args.out, `offline-${deployment}-results.json`), JSON.stringify({ url: args.url, cached, failures, status: "pass" }, null, 2));
  await context.close();
  console.log(JSON.stringify({ url: args.url, cached: cached.length, failures, status: "pass" }));
} catch (error) {
  await writeFile(path.join(args.out, `offline-${deployment}-results.json`), JSON.stringify({ url: args.url, status: "fail", message: error.message }, null, 2));
  throw error;
} finally {
  await browser.close();
}
