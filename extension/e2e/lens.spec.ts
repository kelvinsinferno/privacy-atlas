/**
 * Chromium e2e: Privacy Atlas extension mounts a toast naming an Atlas move
 * on a page that references a known tracker host (google-analytics.com).
 *
 * Fixture URL approach: http://localhost:<port>/tracker-page.html served by a
 * minimal Node http static server spun up in beforeAll. We prefer http:// over
 * file:// because PerformanceObserver resource entries are reliably surfaced on
 * http origins; file:// may restrict resource-timing data depending on the
 * browser's security heuristics.
 *
 * Shadow-DOM: the toast card ([data-atlas-toast]) lives inside an open shadow
 * root attached to a host <div>. Playwright's locator engine pierces open
 * shadow roots, so page.locator("[data-atlas-toast]") finds it directly.
 */

import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const extPath = join(__dirname, "..", ".output", "chrome-mv3");
const fixturesDir = join(__dirname, "fixtures");

// ── static http server ────────────────────────────────────────────────────────

let server: Server;
let baseUrl: string;

function startStaticServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server = createServer((req, res) => {
      const file = (req.url ?? "/").replace(/^\//, "") || "index.html";
      const filePath = join(fixturesDir, file);
      try {
        const content = readFileSync(filePath);
        const ext = file.split(".").pop() ?? "";
        const mime: Record<string, string> = {
          html: "text/html",
          js: "application/javascript",
          css: "text/css",
        };
        res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Could not determine server address"));
        return;
      }
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });

    server.on("error", reject);
  });
}

// ── persistent Chromium context with extension ────────────────────────────────

let context: BrowserContext;

test.beforeAll(async () => {
  await startStaticServer();

  context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
    ],
  });
});

test.afterAll(async () => {
  await context?.close();
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

// ── test ──────────────────────────────────────────────────────────────────────

test("renders a toast naming an Atlas move on a page with a known tracker", async () => {
  const page = await context.newPage();

  // Navigate to the fixture page served over http so that
  // PerformanceObserver reliably surfaces the google-analytics.com resource entry.
  await page.goto(`${baseUrl}/tracker-page.html`, { waitUntil: "domcontentloaded" });

  // The toast card is inside an open shadow root; Playwright's locator engine
  // pierces open shadow roots by default, so this selector reaches through.
  const toast = page.locator("[data-atlas-toast]");
  await expect(toast.first()).toBeVisible({ timeout: 15000 });

  // adopt-mode body: "Atlas move that defends this: <move>."
  await expect(toast.first()).toContainText("Atlas move");
});

test("does not duplicate toast cards across repeated analyze() cycles (BUG 1 regression)", async () => {
  const page = await context.newPage();

  // Navigate to the same tracker fixture; the detector will run analyze() on
  // load AND on subsequent PerformanceObserver batches, so without the dedupe
  // guard the same threat ids would be mounted multiple times.
  await page.goto(`${baseUrl}/tracker-page.html`, { waitUntil: "domcontentloaded" });

  // Wait for at least one toast to appear.
  const toast = page.locator("[data-atlas-toast]");
  await expect(toast.first()).toBeVisible({ timeout: 15000 });

  // Allow extra time for additional PerformanceObserver / analyze() cycles to fire
  // so that any duplicate mounting would have occurred by now.
  await page.waitForTimeout(1500);

  // After repeated analyze cycles, there must be no DUPLICATE cards for the same threat
  // (the count itself varies with the dataset; the invariant is one card per distinct threat).
  const ids = await page.locator("[data-atlas-toast]").evaluateAll(
    (els) => els.map((e) => e.getAttribute("data-atlas-toast"))
  );
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length); // all unique → no duplicates
});

test("caps on-page cards at 3 and expands on click", async () => {
  const page = await context.newPage();

  // The fixture now loads google-analytics.com (analytics: T-TELEMETRY, T-INFERENCE) +
  // canvas.toDataURL (fingerprinting: T-FINGERPRINT) + doubleclick.net (advertising:
  // T-BIDSTREAM, T-BROKER, T-PATTERN-OF-LIFE) → ≥6 distinct threats → cap at 3 + overflow.
  await page.goto(`${baseUrl}/tracker-page.html`, { waitUntil: "domcontentloaded" });

  // Wait for the first toast to appear, then settle so all analyze() cycles complete.
  await expect(page.locator("[data-atlas-toast]").first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1500);

  // Collapsed state: exactly 3 on-page cards + the clickable more footer.
  await expect(page.locator("[data-atlas-toast]")).toHaveCount(3);
  await expect(page.locator("[data-atlas-more]")).toHaveCount(1);

  // Click the more card to expand.
  await page.locator("[data-atlas-more]").click();

  // Expanded state: more footer gone, total cards > 3.
  await expect(page.locator("[data-atlas-more]")).toHaveCount(0);
  const n = await page.locator("[data-atlas-toast]").count();
  expect(n).toBeGreaterThan(3);
});

test("dismissed cards do not reappear on the next analyze cycle", async () => {
  const page = await context.newPage();

  // Navigate to the tracker fixture — google-analytics.com produces
  // T-TELEMETRY and T-INFERENCE (2 threat cards).
  await page.goto(`${baseUrl}/tracker-page.html`, { waitUntil: "domcontentloaded" });

  const toast = page.locator("[data-atlas-toast]");
  await expect(toast.first()).toBeVisible({ timeout: 15000 });

  // Capture the threatId of the first card (its data-atlas-toast attribute)
  // before dismissing, so we can assert it specifically stays gone.
  const dismissedThreatId = await toast.first().getAttribute("data-atlas-toast");
  expect(dismissedThreatId).toBeTruthy();

  // Click dismiss on the first card.
  await page.locator('[data-act="dismiss"]').first().click();

  // Force a new resource load to trigger another PerformanceObserver / analyze() cycle.
  await page.evaluate(() => {
    const i = document.createElement("img");
    i.src = "https://google-analytics.com/collect?v=2&_=" + Date.now();
    document.body.appendChild(i);
  });

  // Wait past the 500ms debounce for the re-analyze cycle to run.
  await page.waitForTimeout(2000);

  // The dismissed card must NOT have reappeared — its specific threatId should
  // have count 0 in the DOM.
  await expect(page.locator(`[data-atlas-toast="${dismissedThreatId}"]`)).toHaveCount(0);
});
