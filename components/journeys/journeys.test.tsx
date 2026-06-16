import { expect, test, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildModel } from "@/lib/model";
import JourneysView from "@/components/journeys/JourneysView";
import BackupModal from "@/components/journeys/BackupModal";
import { JOURNEYS } from "@/data/journeys";

/* ---------- window.storage mock ---------- */
const storageMock = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Assign mock to window so the verbatim port's window.storage calls work
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).storage = storageMock;
});

/* ---------- shared fixtures ---------- */
const model = buildModel({});
const noopExplore = vi.fn();
const noopInspect = vi.fn();

function renderView(overrides: Partial<React.ComponentProps<typeof JourneysView>> = {}) {
  return render(
    <JourneysView
      model={model}
      onExplore={noopExplore}
      onInspect={noopInspect}
      selected={null}
      homeSignal={0}
      {...overrides}
    />
  );
}

/* ---------- 1. Mission list renders ---------- */
test("renders mission list with known mission labels from JOURNEYS data", () => {
  renderView();
  // "Lock the foundations" is the first mission in JOURNEYS
  expect(screen.getByText("Lock the foundations")).toBeInTheDocument();
  // Another known mission
  expect(screen.getByText("Make my phone private")).toBeInTheDocument();
});

test("renders all 10 missions in the list", () => {
  renderView();
  // Each mission has a unique label; confirm count via JOURNEYS data
  JOURNEYS.forEach((j) => {
    // Truncated blurbs don't show full labels, but mission card labels do
    expect(screen.getByText(j.label)).toBeInTheDocument();
  });
});

/* ---------- 2. ⭐ badge for "Start here" section ---------- */
test("shows the 'most people start here' badge on Start here missions", () => {
  renderView();
  // The "Start here" section should have the badge; JOURNEYS[0].section === "Start here"
  const badges = screen.getAllByText("⭐ most people start here");
  expect(badges.length).toBeGreaterThan(0);
});

/* ---------- 3. Clicking a mission opens its steps ---------- */
test("clicking a mission card opens its step list", async () => {
  const user = userEvent.setup();
  renderView();

  // Click "Lock the foundations" (first journey)
  const card = screen.getByText("Lock the foundations");
  await user.click(card);

  // The "← all missions" back link should appear
  expect(screen.getByText(/all missions/)).toBeInTheDocument();

  // A step from the foundations mission should appear (password-manager → "Use a password manager")
  // The mission detail renders stage names; "ACCOUNTS" is the first stage of foundations
  expect(screen.getByText("ACCOUNTS")).toBeInTheDocument();
});

/* ---------- 4. homeSignal returning to mission list ---------- */
test("changing homeSignal returns to the mission list", async () => {
  const user = userEvent.setup();
  const { rerender } = renderView({ homeSignal: 0 });

  // Open a mission
  const card = screen.getByText("Lock the foundations");
  await user.click(card);
  expect(screen.getByText(/all missions/)).toBeInTheDocument();

  // Bump homeSignal — simulates tab re-click
  rerender(
    <JourneysView
      model={model}
      onExplore={noopExplore}
      onInspect={noopInspect}
      selected={null}
      homeSignal={1}
    />
  );

  // Should be back on the mission list
  expect(screen.getByText("Lock the foundations")).toBeInTheDocument();
  expect(screen.queryByText(/all missions/)).not.toBeInTheDocument();
});

/* ---------- 5. Hero amber CTA opens the shell AI modal ---------- */
test("hero 'Ask AI · build my plan' CTA calls onAskAI; no inline AI panel on the landing", async () => {
  const user = userEvent.setup();
  const onAskAI = vi.fn();
  renderView({ onAskAI });
  // The hero amber doorway is present
  const cta = screen.getByText("✦ Ask AI · build my plan");
  await user.click(cta);
  expect(onAskAI).toHaveBeenCalledTimes(1);
  // The OLD buried inline panel is gone
  expect(screen.queryByText(/START WITH AI/)).not.toBeInTheDocument();
  expect(screen.queryByText("◈ help me pick my first mission")).not.toBeInTheDocument();
});

/* ---------- 6. Toggling a step checkbox persists to window.storage ---------- */
test("toggling a step checkbox marks it done and calls window.storage.set", async () => {
  const user = userEvent.setup();
  renderView();

  // Open "Lock the foundations"
  const card = screen.getByText("Lock the foundations");
  await user.click(card);

  // Find the first checkbox (mark done button) — there should be step cards
  const checkboxes = screen.getAllByTitle("mark done");
  expect(checkboxes.length).toBeGreaterThan(0);

  // Click the first checkbox to mark a step done
  await user.click(checkboxes[0]);

  // storage.set should have been called with journeyProgress
  expect(storageMock.set).toHaveBeenCalledWith(
    "journeyProgress",
    expect.stringContaining("{"),
    false
  );
});

/* ---------- 7. Step detail: onInspect fires when clicking the step card ---------- */
test("clicking a step card fires onInspect", async () => {
  const user = userEvent.setup();
  const onInspect = vi.fn();
  renderView({ onInspect });

  // Open "Lock the foundations"
  await user.click(screen.getByText("Lock the foundations"));

  // Click the step card itself (not the checkbox) — first step
  const stepCards = document.querySelectorAll('[title="open how-to & details"]');
  expect(stepCards.length).toBeGreaterThan(0);
  await user.click(stepCards[0] as HTMLElement);

  expect(onInspect).toHaveBeenCalled();
});

/* ---------- 8. FreshStart renders when no steps are done ---------- */
test("renders FreshStart empty state when no steps completed", () => {
  renderView();
  expect(screen.getByText("YOUR MAP STARTS HERE")).toBeInTheDocument();
});

/* ---------- 9. Section headers render ---------- */
test("renders section headers for all 4 sections", () => {
  renderView();
  // Sections: "Start here", "Digital", "Physical & financial", "Advanced & collective"
  const sections = Array.from(new Set(JOURNEYS.map((j) => j.section)));
  sections.forEach((sec) => {
    expect(screen.getByText(sec)).toBeInTheDocument();
  });
});

/* ---------- 10. BackupModal smoke test ---------- */
test("BackupModal renders modal chrome and we-can't-recover copy", () => {
  render(<BackupModal onClose={vi.fn()} onRestored={vi.fn()} />);
  // Modal header kicker
  expect(screen.getByText("BACK UP / RESTORE MY JOURNEY")).toBeInTheDocument();
  // The "we can't recover it for you" copy
  expect(screen.getByText(/we can't recover it for you/)).toBeInTheDocument();
  // The copy backup button
  expect(screen.getByText("copy backup")).toBeInTheDocument();
  // The import button
  expect(screen.getByText("import what's pasted above")).toBeInTheDocument();
});

test("BackupModal import with invalid JSON shows error message via importBackup validation", async () => {
  const user = userEvent.setup();
  render(<BackupModal onClose={vi.fn()} onRestored={vi.fn()} />);

  // Wait for the async useEffect to settle so the textarea has its final value
  const textarea = screen.getByRole("textbox");
  await waitFor(() => expect(textarea).not.toHaveValue("loading your data…"));

  // Override with invalid JSON — use fireEvent to avoid userEvent special-char parsing of braces
  fireEvent.change(textarea, { target: { value: "not valid json at all" } });

  // Click the import button
  const importBtn = screen.getByText("import what's pasted above");
  await user.click(importBtn);

  // Should show the error message (importBackup throws → caught → setMsg)
  expect(screen.getByText(/couldn't parse that/)).toBeInTheDocument();
});

test("BackupModal import with valid JSON but wrong shape shows error via importBackup shape validation", async () => {
  const user = userEvent.setup();
  render(<BackupModal onClose={vi.fn()} onRestored={vi.fn()} />);

  // Wait for the async useEffect to settle
  const textarea = screen.getByRole("textbox");
  await waitFor(() => expect(textarea).not.toHaveValue("loading your data…"));

  // Valid JSON but not a Privacy Atlas backup (no known keys) — use fireEvent to avoid
  // userEvent special-char parsing of curly braces in the JSON string
  fireEvent.change(textarea, { target: { value: '{"foo":"bar"}' } });

  const importBtn = screen.getByText("import what's pasted above");
  await user.click(importBtn);

  // importBackup throws because no known keys → error message shown
  expect(screen.getByText(/couldn't parse that/)).toBeInTheDocument();
});

/* ---------- 11. Toast appears after toggling a step ---------- */
test("toggling a step done shows the completion toast", async () => {
  const user = userEvent.setup();
  renderView();

  // Open a mission to get to step checkboxes
  await user.click(screen.getByText("Lock the foundations"));

  // Click the first checkbox
  const checkboxes = screen.getAllByTitle("mark done");
  await user.click(checkboxes[0]);

  // Toast should appear — it contains "nice. it's saved."
  expect(screen.getByText(/nice\. it's saved\./)).toBeInTheDocument();
});
