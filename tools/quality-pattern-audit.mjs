import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { qualityArgs, launchQualityBrowser, observePage } from "./quality-runtime.mjs";

const args = qualityArgs({ ref: { type: "string" }, label: { type: "string", default: "current" } });
const sourceUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
async function sourceModule(file) {
  if (!args.ref) return import(pathToFileURL(path.resolve(file)).href);
  // 원본 기준선(d1095f2)은 두 도안 모듈이 외부 import 없이 자립한다.
  return import(sourceUrl(execFileSync("git", ["show", `${args.ref}:${file}`], { encoding: "utf8" })));
}
const { TEMPLATES, templateToReference } = await sourceModule("src/core/templates.js");
const { BUILTIN_PATTERNS } = await sourceModule("src/core/patterns.js");
const renderer = sourceUrl(await readFile("src/core/renderer.js", "utf8"));
const browser = await launchQualityBrowser(args);
const records = [];
await mkdir(args.out, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1120, height: 1100 }, deviceScaleFactor: 1 });
  const errors = observePage(page);
  for (const size of [16, 32, 64]) {
    for (const kind of ["draw", "gem"]) {
      const designs = kind === "draw"
        ? TEMPLATES.map((t) => ({ name: t.name, cells: templateToReference(t, size), thumbCells: templateToReference(t, 16) }))
        : BUILTIN_PATTERNS.map((p) => ({ name: p.name, cells: p.make(size) }));
      await page.setContent(`<!doctype html><html lang="ko"><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;padding:24px;background:#141519;color:#e8e6e1;font:14px 'Segoe UI',sans-serif}
        h1{font-size:22px;margin:0 0 18px}main{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
        article{padding:12px;background:#1e2027;border-radius:8px}h2{font-size:15px;margin:0 0 10px}
        canvas{display:block;image-rendering:pixelated}.large{width:168px;height:168px;max-width:100%}
        .thumb{width:48px;height:48px;margin-top:10px}small{display:block;margin-top:6px;color:#aaa}
      </style><h1>${args.label} · ${kind === "draw" ? "그림" : "보석"} 도안 20개 · ${size}×${size}</h1><main></main></html>`);
      await page.evaluate(async ({ renderer, designs, kind, size, nativeThumb }) => {
        const { render } = await import(renderer);
        designs.forEach(({ name, cells, thumbCells }, index) => {
          const card = document.createElement("article");
          const title = document.createElement("h2");
          title.textContent = `${index + 1}. ${name}`;
          const canvas = document.createElement("canvas");
          canvas.className = "large";
          render(canvas, kind === "gem" ? cells : Array(size * size).fill(null), size,
            kind === "gem" ? { gem: true } : { reference: cells });
          const thumb = document.createElement("canvas");
          const thumbSize = kind === "draw" ? 16 : size;
          thumb.className = "thumb"; thumb.width = nativeThumb ? thumbSize : 48; thumb.height = thumb.width;
          const ctx = thumb.getContext("2d");
          (thumbCells ?? cells).forEach((cell, i) => {
            if (kind === "gem" && !cell) return;
            ctx.fillStyle = kind === "gem" ? cell : cell === 45 ? "#2d2d2d" : "#f4f4f4";
            const scale = thumb.width / thumbSize;
            ctx.fillRect(i % thumbSize * scale, Math.floor(i / thumbSize) * scale, scale, scale);
          });
          const caption = document.createElement("small");
          caption.textContent = "실제 렌더러 / 48px 썸네일";
          card.append(title, canvas, thumb, caption); document.querySelector("main").append(card);
        });
      }, { renderer, designs, kind, size, nativeThumb: !args.ref });
      const filename = `${args.label}-${kind}-${size}.png`;
      await page.screenshot({ path: path.join(args.out, filename), fullPage: true });
      for (const [index, design] of designs.entries()) {
        const ink = design.cells.flatMap((c, i) => (kind === "draw" ? c === 45 : c !== null) ? [i] : []);
        records.push({ kind, index, name: design.name, size, length: design.cells.length, ink: ink.length,
          colors: [...new Set(design.cells.filter((c) => c !== null))],
          edge: ink.some((i) => i % size === 0 || i % size === size - 1 || i < size || i >= size * (size - 1)),
          screenshot: filename, visual: "pending-human-or-agent-image-review" });
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(path.join(args.out, `${args.label}-metrics.json`), JSON.stringify(records, null, 2));
  console.log(JSON.stringify({ variants: records.length, screenshots: 6, errors, out: args.out }));
} finally {
  await browser.close();
}
