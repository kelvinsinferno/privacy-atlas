import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const extPath = join(__dirname, "..", ".output", "chrome-mv3");
const html = readFileSync(join(__dirname, "fixtures", "form-page.html"), "utf8");

let context: BrowserContext;
let server: Server;
let url = "";

test.beforeAll(async () => {
  server = createServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(html);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  url = `http://127.0.0.1:${port}/`;
  context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
  });
});

test.afterAll(async () => {
  await context?.close();
  await new Promise<void>((r) => server.close(() => r()));
});

test("shows the ✦ icon on a classified field + popover with the move + deep-link", async () => {
  const page = await context.newPage();
  await page.goto(url);
  await page.locator("#email").focus();
  const icon = page.locator("[data-atlas-field-icon]");
  await expect(icon).toBeVisible({ timeout: 10000 });
  await icon.click();
  const pop = page.locator("[data-atlas-field-popover]");
  await expect(pop).toBeVisible();
  await expect(pop).toContainText("alias");
  await expect(pop.locator("a")).toHaveAttribute("href", /\/\?node=email-aliasing$/);
});

test("does NOT show the icon on a search or password field", async () => {
  const page = await context.newPage();
  await page.goto(url);
  await page.locator("#search").focus();
  await page.waitForTimeout(800);
  // Use evaluateAll to check visibility robustly through shadow DOM
  const searchIconCount = await page
    .locator("[data-atlas-field-icon]")
    .evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).style.display !== "none").length
    );
  expect(searchIconCount).toBe(0);
  await page.locator("#pw").focus();
  await page.waitForTimeout(400);
  const pwIconCount = await page
    .locator("[data-atlas-field-icon]")
    .evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).style.display !== "none").length
    );
  expect(pwIconCount).toBe(0);
});
