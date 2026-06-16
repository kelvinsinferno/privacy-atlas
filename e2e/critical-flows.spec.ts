/**
 * e2e/critical-flows.spec.ts
 * Playwright critical-flow suite for Privacy Atlas.
 *
 * Flows:
 *  1. Map renders  — svg + node elements visible on load
 *  2. Onboarding → path builds  — 3-question flow produces a path
 *  3. AI chat streams (mocked /api/ai)  — streamed reply renders
 *  4. Backup export → import round-trip  — modal, copy, invalid-import error
 *  5. ⌘K opens + navigates  — palette opens, search works, Enter opens detail
 */

import { test, expect, Page } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Navigate to the app root and wait for initial hydration. */
async function goHome(page: Page) {
  await page.goto("/");
  // Wait for the tab nav to be rendered (proves React has hydrated).
  await page.getByRole("tab", { name: /the web/i }).waitFor({ state: "visible" });
}

/* ------------------------------------------------------------------ */
/*  1. Map renders                                                      */
/* ------------------------------------------------------------------ */

test("map renders: svg + node elements visible on load", async ({ page }) => {
  await goHome(page);

  // Header logo is visible — confirms page rendered correctly
  const logo = page.getByRole("img", { name: /privacy atlas/i }).first();
  await expect(logo).toBeVisible();

  // THE WEB tab is selected by default
  const mapTab = page.getByRole("tab", { name: /the web/i });
  await expect(mapTab).toBeVisible();

  // The D3 force graph renders an <svg> element
  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible({ timeout: 15000 });

  // At least one circle (node) rendered inside the SVG
  // D3 renders circles for moves and rects (rotated) for threats
  const circle = page.locator("svg circle").first();
  await expect(circle).toBeVisible({ timeout: 15000 });
});

/* ------------------------------------------------------------------ */
/*  2. Onboarding → path builds                                        */
/* ------------------------------------------------------------------ */

test("onboarding → path builds: 3-question flow produces a path", async ({ page }) => {
  await goHome(page);

  // The welcome panel (right column) has the onboarding button when no node is selected
  const onboardingBtn = page.getByRole("button", {
    name: /three quick questions.*personalized path/i,
  });
  await expect(onboardingBtn).toBeVisible();
  await onboardingBtn.click();

  // Step 1 of 3: "Who are you most worried about?"
  await expect(page.getByText(/who are you most worried about/i)).toBeVisible();
  // Pick "Everything, broadly" (key: "broad")
  await page.getByRole("button", { name: /everything, broadly/i }).click();
  await page.getByRole("button", { name: /next →/i }).click();

  // Step 2 of 3: "How much effort can you sustain?"
  await expect(page.getByText(/how much effort can you sustain/i)).toBeVisible();
  // Pick "A solid setup"
  await page.getByRole("button", { name: /a solid setup/i }).click();
  await page.getByRole("button", { name: /next →/i }).click();

  // Step 3 of 3: "Where are you starting from?"
  await expect(page.getByText(/where are you starting from/i)).toBeVisible();
  // Pick "I've done the basics"
  await page.getByRole("button", { name: /i've done the basics/i }).click();
  // Final step button
  await page.getByRole("button", { name: /◎ build my path/i }).click();

  // After completing onboarding, the app switches to the MY PATH tab.
  // PathView shows "WHERE YOU ARE" or the phase heading "START HERE".
  // We wait for at least one of those text markers.
  const pathRendered = page.getByText(/start here|where you are|moves, in the order/i).first();
  await expect(pathRendered).toBeVisible({ timeout: 10000 });
});

/* ------------------------------------------------------------------ */
/*  3. AI chat streams (mocked /api/ai)                                */
/* ------------------------------------------------------------------ */

test("AI chat streams: mocked /api/ai reply renders", async ({ page }) => {
  // Mock BEFORE any navigation so the intercept is active when the page loads
  await page.route("**/api/ai", (route) => {
    route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
      body: [
        'data: {"choices":[{"delta":{"content":"Hello from test"}}]}',
        "",
        "data: [DONE]",
        "",
        "",
      ].join("\n"),
    });
  });

  await goHome(page);

  // Open the assistant via the persistent global launcher pill (present on every tab).
  const launcher = page.getByRole("button", { name: /ask the atlas ai assistant/i });
  await expect(launcher).toBeVisible({ timeout: 8000 });
  await launcher.click();

  // The center-stage modal opens — its heading is "✦ Atlas assistant".
  await expect(page.getByText("✦ Atlas assistant")).toBeVisible({ timeout: 8000 });

  // The modal wraps EmbeddedAIChat in an onClickCapture div. Clicking starter
  // buttons can trigger the warn-open re-render before the button's own onClick
  // fires. The reliable path is: type a message in the chat input and Send —
  // that always fires the fetch directly.

  // Click the warning teaser first (opens the honest tradeoff copy, makes the
  // chat area fully interactive without interfering with the input).
  const warnBtn = page.getByRole("button", { name: /conversations leave this site/i });
  await expect(warnBtn).toBeVisible({ timeout: 5000 });
  await warnBtn.click();

  // Find the chat input (placeholder changes once messages exist)
  const chatInput = page.locator(
    "input[placeholder*='type your own question']"
  );
  await expect(chatInput).toBeVisible({ timeout: 5000 });
  await chatInput.fill("What should I do first?");

  // Click Send
  const sendBtn = page.getByRole("button", { name: "send" });
  await sendBtn.click();

  // The streamed reply "Hello from test" should appear in the chat
  await expect(page.getByText("Hello from test")).toBeVisible({ timeout: 12000 });
});

/* ------------------------------------------------------------------ */
/*  4. Backup export → import round-trip                               */
/* ------------------------------------------------------------------ */

test("backup modal: export text contains privacyAtlasBackup; invalid import shows error", async ({
  page,
}) => {
  // The backup button ("⛃ back up / restore my journey") is only rendered in
  // JourneysView when done has at least one entry. The storage bridge exposes
  // window.storage which reads from localStorage with prefix "pa:priv:".
  // Seed the key BEFORE navigating so the initial load picks it up.
  await page.addInitScript(() => {
    try {
      const progress = JSON.stringify({ "password-manager": Date.now() });
      // StorageBridge.tsx uses storage.ts which prefixes keys with "pa:priv:"
      window.localStorage.setItem("pa:priv:journeyProgress", progress);
    } catch {
      // private mode — ignore
    }
  });

  await goHome(page);

  // Navigate to Journeys
  await page.getByRole("tab", { name: /journeys/i }).click();

  // Wait for the storage async load + React re-render
  await page.waitForTimeout(1500);

  // The backup button appears when progress is non-empty
  const backupBtn = page.getByRole("button", { name: /back up.*restore/i });
  await expect(backupBtn).toBeVisible({ timeout: 8000 });
  await backupBtn.click();

  // The BackupModal should now be open — the modal's kicker span is a <span>
  // with exact text "BACK UP / RESTORE MY JOURNEY"
  const modalKicker = page.getByText("BACK UP / RESTORE MY JOURNEY", { exact: true });
  await expect(modalKicker).toBeVisible({ timeout: 8000 });

  // The textarea holds the exported backup text (starts as "loading your data…"
  // then fills with the exportBackup() output which contains "privacyAtlasBackup").
  const textarea = page.locator("textarea");
  await expect(textarea).toBeVisible();

  // Wait for the async exportBackup to populate the textarea
  await expect(async () => {
    const val = await textarea.inputValue();
    expect(val).toMatch(/privacyAtlasBackup/i);
  }).toPass({ timeout: 8000 });

  // Test the invalid-import error path: paste garbage into the textarea
  await textarea.fill("this is not valid backup text");
  await page.getByRole("button", { name: /import what's pasted above/i }).click();

  // The error message should appear
  await expect(
    page.getByText(/couldn't parse that/i)
  ).toBeVisible({ timeout: 5000 });
});

/* ------------------------------------------------------------------ */
/*  5. ⌘K opens + navigates                                           */
/* ------------------------------------------------------------------ */

test("⌘K palette: opens, searches 'password', click result opens detail", async ({ page }) => {
  await goHome(page);

  // Give the CommandK component's useEffect time to register its document listener
  // (React async effects run after paint; the keydown handler adds via addEventListener).
  await page.waitForTimeout(500);

  // On Windows/Linux in Playwright, page.keyboard.press("Control+K") may not
  // reliably fire on the document-level listener. Use evaluate to dispatch the
  // exact KeyboardEvent that the CommandK component listens for.
  await page.evaluate(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
  });

  // The palette dialog should appear (role="dialog" aria-label="Search")
  const paletteDialog = page.getByRole("dialog", { name: /search/i });
  await expect(paletteDialog).toBeVisible({ timeout: 8000 });

  // The search input inside the palette
  const paletteInput = page.getByRole("textbox", { name: /search the whole site/i });
  await expect(paletteInput).toBeVisible({ timeout: 5000 });

  // Type "password" to search
  await paletteInput.fill("password");

  // "Password manager" result should appear in the listbox. Several entries
  // mention "password" (1Password, Bitwarden, …); target the move itself.
  const result = page.getByRole("option", { name: /^password manager/i }).first();
  await expect(result).toBeVisible({ timeout: 5000 });

  // Click the result directly (more reliable than Enter in this context)
  await result.click();

  // Palette closes and the detail panel opens for Password manager
  // The Detail component renders an h2 with the node label
  const detailHeading = page.getByRole("heading", { name: /password manager/i });
  await expect(detailHeading).toBeVisible({ timeout: 8000 });

  // Confirm we're on the map tab (CommandK's onSelect calls setTab("map") + setSelected)
  const mapTab = page.getByRole("tab", { name: /the web/i });
  await expect(mapTab).toHaveAttribute("aria-selected", "true");
});
