/**
 * gen-icons.mjs — rasterize globe SVGs at 16/32/48/128 px using Playwright Chromium.
 * 16+32: rendered from extension/icon-small.svg (bold variant, legible at small sizes)
 * 48+128: rendered from app/icon.svg (full detailed mark)
 * Run from extension/: node scripts/gen-icons.mjs
 */
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionDir = join(__dirname, "..");
const repoRoot = join(extensionDir, "..");
const outDir = join(extensionDir, "public", "icon");

mkdirSync(outDir, { recursive: true });

// Each job specifies the output size and which SVG source to rasterize from.
// Small sizes (16/32) use the bold variant; large sizes (48/128) use the full mark.
const JOBS = [
  { size: 16,  src: join(extensionDir, "icon-small.svg") },
  { size: 32,  src: join(extensionDir, "icon-small.svg") },
  { size: 48,  src: join(repoRoot, "app", "icon.svg") },
  { size: 128, src: join(repoRoot, "app", "icon.svg") },
];

const browser = await chromium.launch();
try {
  for (const { size, src } of JOBS) {
    const svgSource = readFileSync(src, "utf8");

    // Inject explicit width/height into the root <svg> tag so the page renders at exactly that size.
    const sized = svgSource.replace(
      /^(<svg\b[^>]*?)>/,
      `$1 width="${size}" height="${size}">`
    );

    const page = await browser.newPage();
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<!doctype html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;}</style></head><body style="width:${size}px;height:${size}px;overflow:hidden;">${sized}</body></html>`
    );

    const outPath = join(outDir, `${size}.png`);
    await page.locator("svg").screenshot({ path: outPath, omitBackground: false });
    await page.close();
    console.log(`✓ ${size}px → public/icon/${size}.png  (src: ${src})`);
  }
} finally {
  await browser.close();
}

console.log("All icons generated.");
