import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import path from "node:path";

export function qualityArgs(extra = {}) {
  return parseArgs({ options: {
    playwright: { type: "string" },
    channel: { type: "string", default: "msedge" },
    url: { type: "string", default: "http://127.0.0.1:5199/" },
    out: { type: "string", default: "docs/quality/evidence" },
    ...extra,
  } }).values;
}

// 검증 환경의 기존 Playwright를 사용한다. 프로젝트 의존성을 설치하지 않는다.
export async function launchQualityBrowser(args) {
  const module = args.playwright
    ? await import(pathToFileURL(path.resolve(args.playwright)).href)
    : await import("playwright");
  return module.chromium.launch({ channel: args.channel, headless: true });
}

export function observePage(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
  });
  return errors;
}
