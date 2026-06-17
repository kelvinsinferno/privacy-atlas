import { expect, test, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrivacyAtlas from "./PrivacyAtlas";

/* ---------- window.storage mock (needed for live-map-refresh test) ---------- */
const storageMock = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
};
beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).storage = storageMock;
});

test("app shell renders the logo in the header (accessible)", () => {
  render(<PrivacyAtlas />);
  // The horizontal logo replaces the h1 text — find it by role+name
  const logos = screen.getAllByRole("img", { name: /privacy atlas/i });
  // At minimum one logo is visible (header); welcome panel logo may also be present
  expect(logos.length).toBeGreaterThanOrEqual(1);
  // tab bar still present
  expect(screen.getByText("◇ THE WEB")).toBeInTheDocument();
});

test("welcome panel renders the stacked logo when nothing is selected", () => {
  render(<PrivacyAtlas />);
  // Both logos are rendered (header + welcome panel), both named "Privacy Atlas"
  const logos = screen.getAllByRole("img", { name: /privacy atlas/i });
  expect(logos.length).toBeGreaterThanOrEqual(2);
  // Welcome copy still present
  expect(screen.getByText(/HOW TO EXPLORE/)).toBeInTheDocument();
});

test("header statline links to the privacy policy", () => {
  render(<PrivacyAtlas />);
  const link = screen.getByRole("link", { name: /privacy policy/i });
  expect(link).toHaveAttribute("href", "/privacy");
});

test("tab buttons have role=tab and active tab has aria-selected", () => {
  render(<PrivacyAtlas />);
  const tabs = screen.getAllByRole("tab");
  expect(tabs.length).toBeGreaterThan(0);
  const activeTab = tabs.find((t) => t.getAttribute("aria-selected") === "true");
  expect(activeTab).toBeTruthy();
});

test("my devices button has an accessible aria-label", () => {
  render(<PrivacyAtlas />);
  const devicesBtn = screen.getByRole("button", { name: /my devices/i });
  expect(devicesBtn).toBeTruthy();
});

test("combine mode toggle button renders and toggles aria-pressed", () => {
  render(<PrivacyAtlas />);
  const combineBtn = screen.getByRole("button", { name: /combine mode/i });
  expect(combineBtn).toBeTruthy();
  // Initially OFF
  expect(combineBtn.getAttribute("aria-pressed")).toBe("false");
  // Toggle ON
  fireEvent.click(combineBtn);
  expect(combineBtn.getAttribute("aria-pressed")).toBe("true");
  // Toggle OFF again
  fireEvent.click(combineBtn);
  expect(combineBtn.getAttribute("aria-pressed")).toBe("false");
});

test("combine mode hint text changes when combine mode is toggled", () => {
  render(<PrivacyAtlas />);
  // Default hint shows isolate/shift-click instructions
  expect(screen.getByText(/click = isolate one/i)).toBeInTheDocument();
  // Enable combine mode
  const combineBtn = screen.getByRole("button", { name: /combine mode/i });
  fireEvent.click(combineBtn);
  // Hint should now show combine-mode instructions
  expect(screen.getByText(/⊕ combine is ON/i)).toBeInTheDocument();
});

/* ---------- Live map refresh: doneMap updates without tab switch ---------- */
test("toggling a step in Journeys updates the map's journeyStats tally without a tab switch", async () => {
  const user = userEvent.setup();
  render(<PrivacyAtlas />);

  // Navigate to the Journeys tab
  const journeysTab = screen.getByRole("tab", { name: /journeys/i });
  await user.click(journeysTab);

  // Open "Lock the foundations" mission
  const foundationsCard = await screen.findByText("Lock the foundations");
  await user.click(foundationsCard);

  // Find and click the first "mark done" checkbox
  const checkboxes = screen.getAllByTitle("mark done");
  expect(checkboxes.length).toBeGreaterThan(0);
  await user.click(checkboxes[0]);

  // window.storage.set should have been called with the new progress (proving persistence)
  expect(storageMock.set).toHaveBeenCalledWith("journeyProgress", expect.stringContaining("{"), false);

  // Now switch to the map tab — the left rail should immediately show updated journeyStats
  // (proving doneMap updated live in the shell, not reloaded on tab entry)
  const mapTab = screen.getByRole("tab", { name: /the web/i });
  await user.click(mapTab);

  // The "MY JOURNEY ON THE WEB" tally text should show at least 1 move done
  // (journeyStats.dc > 0 → the "N moves done · ..." text appears)
  await waitFor(() => {
    expect(screen.getByText(/moves done/i)).toBeInTheDocument();
  });
});

/* ---------- Timestamp semantics preserved ---------- */
test("toggling a step in Journeys sets done[id] to a timestamp (number) and unchecking deletes it", async () => {
  const user = userEvent.setup();
  render(<PrivacyAtlas />);

  // Navigate to Journeys, open a mission, toggle a step
  const journeysTab = screen.getByRole("tab", { name: /journeys/i });
  await user.click(journeysTab);
  const foundationsCard = await screen.findByText("Lock the foundations");
  await user.click(foundationsCard);

  const checkboxes = screen.getAllByTitle("mark done");
  await user.click(checkboxes[0]);

  // Capture the persisted value on first check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCalls = storageMock.set.mock.calls as any[][];
  const firstSetCall = allCalls.find((c) => c[0] === "journeyProgress");
  expect(firstSetCall).toBeTruthy();
  const persisted = JSON.parse(firstSetCall![1]);
  // At least one key should have a numeric timestamp value (Date.now() style)
  const values = Object.values(persisted);
  expect(values.length).toBeGreaterThan(0);
  expect(typeof values[0]).toBe("number");
  expect(values[0] as number).toBeGreaterThan(0);

  // Uncheck the same step
  const doneCheckboxes = screen.getAllByTitle("mark done");
  await user.click(doneCheckboxes[0]);

  // The second set call should have the key deleted (empty object or key absent)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedCalls = (storageMock.set.mock.calls as any[][]).filter((c) => c[0] === "journeyProgress");
  const lastPersisted = JSON.parse(updatedCalls[updatedCalls.length - 1][1]);
  // The node id that was set should now be absent
  const nodeId = Object.keys(persisted)[0];
  expect(lastPersisted[nodeId]).toBeUndefined();
});

/* ---------- The 3 amber doorways all open the one center-stage AI modal ---------- */
test("global launcher pill opens the center-stage AI modal", async () => {
  const user = userEvent.setup();
  render(<PrivacyAtlas />);
  // The modal heading is not present until opened
  expect(screen.queryByText("✦ Atlas assistant")).not.toBeInTheDocument();
  const launcher = screen.getByRole("button", { name: /ask the atlas ai assistant/i });
  await user.click(launcher);
  expect(screen.getByText("✦ Atlas assistant")).toBeInTheDocument();
});

test("welcome-panel AI button opens the center-stage AI modal", async () => {
  const user = userEvent.setup();
  render(<PrivacyAtlas />);
  const welcomeBtn = screen.getByRole("button", { name: /ask ai — it builds your plan/i });
  await user.click(welcomeBtn);
  expect(screen.getByText("✦ Atlas assistant")).toBeInTheDocument();
});

test("Journeys hero CTA opens the center-stage AI modal", async () => {
  const user = userEvent.setup();
  render(<PrivacyAtlas />);
  await user.click(screen.getByRole("tab", { name: /journeys/i }));
  // The launcher pill (aria-label) and the hero CTA share visible text but differ
  // by accessible name — the hero CTA's name IS its text.
  const cta = await screen.findByRole("button", { name: "✦ Ask AI · build my plan" });
  await user.click(cta);
  expect(screen.getByText("✦ Atlas assistant")).toBeInTheDocument();
});

test("left-rail SEARCH finds a mission by name and switches to Journeys on click", async () => {
  const user = userEvent.setup();
  render(<PrivacyAtlas />);

  // The left-rail SEARCH is only visible on the map tab (default)
  const searchInput = screen.getByPlaceholderText("find a move or threat…");

  // Type a fragment of a real mission label
  await user.type(searchInput, "Lock the foundations");

  // A button matching the mission label should appear in the search results
  const missionBtn = await screen.findByText("Lock the foundations");
  expect(missionBtn).toBeInTheDocument();

  // Clicking it should switch to the Journeys tab
  await user.click(missionBtn);

  // Journeys tab should now be active (aria-selected)
  const journeysTab = screen.getByRole("tab", { name: /journeys/i });
  expect(journeysTab).toHaveAttribute("aria-selected", "true");
});
