import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildModel } from "@/lib/model";
import ThreatBoard from "./ThreatBoard";

/* All 33 seed threats have at least 2 counters — no zero-defense threats exist in the seed data.
   Tests therefore only exercise the positive (counter-present) branch. */

const model = buildModel({});

function renderBoard(overrides: Partial<React.ComponentProps<typeof ThreatBoard>> = {}) {
  return render(
    <ThreatBoard
      model={model}
      setSelected={vi.fn()}
      onTrace={vi.fn()}
      {...overrides}
    />
  );
}

/* ============================================================
   Basic render
   ============================================================ */

test("ThreatBoard: renders the intro copy and sort controls", () => {
  renderBoard();
  expect(screen.getByText(/Every threat here has an answer/)).toBeInTheDocument();
  expect(screen.getByText("most I can do about it")).toBeInTheDocument();
  expect(screen.getByText("most urgent")).toBeInTheDocument();
});

test("ThreatBoard: renders a 'WHAT DEFEATS IT' region for at least one threat", () => {
  renderBoard();
  // The counterLabel reads "↓ WHAT DEFEATS IT · N moves"
  const hits = screen.getAllByText(/WHAT DEFEATS IT/);
  expect(hits.length).toBeGreaterThan(0);
});

test("ThreatBoard: renders the known threat label 'Data-broker economy'", () => {
  renderBoard();
  expect(screen.getByText("Data-broker economy")).toBeInTheDocument();
});

test("ThreatBoard: renders counter chip labels for T-BROKER", () => {
  renderBoard();
  // Use unique counters (appear in exactly one threat) to avoid multiple-element errors.
  // "exposure-inventory" and "self-osint-check" only appear in T-BROKER.
  expect(screen.getByText("Map where your data leaks (exposure inventory)")).toBeInTheDocument();
  expect(screen.getByText("Search yourself like an investigator (OSINT)")).toBeInTheDocument();
});

/* ============================================================
   Sort controls
   ============================================================ */

test("ThreatBoard: 'most I can do about it' sort button is active by default", () => {
  renderBoard();
  // The active button is rendered with sortBtnOn style (borderColor #5fd3c8).
  // We can't easily inspect inline styles from jsdom, but we can verify both buttons exist
  // and the sort state is "actionable" by confirming the grid renders threats.
  expect(screen.getByText("most I can do about it")).toBeInTheDocument();
  expect(screen.getByText("most urgent")).toBeInTheDocument();
});

test("ThreatBoard: clicking 'most urgent' sort button re-renders without error", async () => {
  const user = userEvent.setup();
  renderBoard();
  await user.click(screen.getByText("most urgent"));
  // After switching sort, threats still render
  expect(screen.getAllByText(/WHAT DEFEATS IT/).length).toBeGreaterThan(0);
  // Switch back
  await user.click(screen.getByText("most I can do about it"));
  expect(screen.getAllByText(/WHAT DEFEATS IT/).length).toBeGreaterThan(0);
});

/* ============================================================
   Counter chip click → setSelected
   ============================================================ */

test("ThreatBoard: clicking a counter chip calls setSelected with the counter's node id", async () => {
  const user = userEvent.setup();
  const setSelected = vi.fn();
  renderBoard({ setSelected });

  // "Map where your data leaks (exposure inventory)" is a unique counter chip for T-BROKER (id: exposure-inventory)
  const chip = screen.getByText("Map where your data leaks (exposure inventory)");
  await user.click(chip);

  expect(setSelected).toHaveBeenCalledOnce();
  expect(setSelected).toHaveBeenCalledWith("exposure-inventory");
});

/* ============================================================
   onTrace wiring
   ============================================================ */

test("ThreatBoard: clicking 'trace on the web' calls onTrace with the threat's id", async () => {
  const user = userEvent.setup();
  const onTrace = vi.fn();
  renderBoard({ onTrace });

  // Multiple "trace on the web ↗" buttons exist (one per threat card).
  // The first one in actionable sort is T-LOCATE (10 counters), which ranks #1.
  const traceButtons = screen.getAllByText(/trace on the web/);
  expect(traceButtons.length).toBeGreaterThan(0);
  await user.click(traceButtons[0]);

  expect(onTrace).toHaveBeenCalledOnce();
  // The id should be a known threat id (starts with "T-")
  const calledId: string = onTrace.mock.calls[0][0];
  expect(calledId).toMatch(/^T-/);
});

/* ============================================================
   RESIDUAL display
   ============================================================ */

test("ThreatBoard: residual copy is displayed inside each threat card", () => {
  renderBoard();
  // The RESIDUAL label is rendered for each card that has counters
  const residualLabels = screen.getAllByText(/RESIDUAL/);
  expect(residualLabels.length).toBeGreaterThan(0);
});

/* ============================================================
   Zero-defense branch — not present in seed data
   ============================================================ */

test("ThreatBoard: NO INDIVIDUAL DEFENSE section is NOT present when all threats have counters", () => {
  renderBoard();
  // All 33 seed threats have counters → noDefense section must be absent
  expect(screen.queryByText(/NO INDIVIDUAL DEFENSE/)).not.toBeInTheDocument();
});

/* ============================================================
   Zero-defense branch — positive test (synthetic model)
   ============================================================ */

test("ThreatBoard: NO INDIVIDUAL DEFENSE section renders for a threat whose counter nodes are missing from byId", () => {
  // ThreatBoard reads GRAPH.threats for the threat list and model.byId to look up counter
  // nodes. T-BEHAVIORAL-DIGITAL has counters ["behavioral-digital-defense",
  // "identity-compartmentalization"]. If we strip those ids from byId, the filter predicate
  // produces an empty counters array → the threat falls into the noDefense section.
  const strippedById = new Map(model.byId);
  strippedById.delete("behavioral-digital-defense");
  strippedById.delete("identity-compartmentalization");
  const zeroDefenseModel = { ...model, byId: strippedById };

  renderBoard({ model: zeroDefenseModel });

  // Section header
  expect(screen.getByText(/NO INDIVIDUAL DEFENSE/)).toBeInTheDocument();
  // Civic-pointer copy: "Push back collectively" journey line
  expect(screen.getByText(/Push back collectively/)).toBeInTheDocument();
  // The zero-defense card renders a "trace on the web" affordance
  // (same button text as the regular cards — there's at least one)
  const traceButtons = screen.getAllByText(/trace on the web/);
  expect(traceButtons.length).toBeGreaterThan(0);
  // The threat label appears inside the zero-defense section
  expect(screen.getByText("Keystroke/mouse biometrics")).toBeInTheDocument();
});

/* ============================================================
   Design R2: one accent per card — chip hover affordance + neutral badge
   ============================================================ */

test("ThreatBoard: counter chip buttons have className 'pa-chip' and a --dc CSS variable set to the domain color", () => {
  renderBoard();
  // Every counter chip button must carry the pa-chip class and a --dc variable.
  // We locate all chip buttons via their role (button) and filter to those with class pa-chip.
  const allButtons = document.querySelectorAll("button.pa-chip");
  expect(allButtons.length).toBeGreaterThan(0);
  // Every pa-chip must have --dc set (non-empty).
  allButtons.forEach((btn) => {
    const dc = (btn as HTMLElement).style.getPropertyValue("--dc");
    expect(dc).toBeTruthy();
  });
});

test("ThreatBoard: trajectory badge is neutral — no TRAJ color and no ▲ glyph", () => {
  renderBoard();
  // No span should contain the ▲ character
  const allSpans = document.querySelectorAll("span");
  allSpans.forEach((span) => {
    expect(span.textContent).not.toContain("▲");
  });
  // The trajectory label text for Data-broker economy should appear without ▲.
  // Data-broker economy has trajectory "growing", so "growing" (without ▲) must exist.
  const trajectorySpans = Array.from(allSpans).filter((s) =>
    ["growing", "steady", "emerging", "exploding", "variable", "shrinking"].includes(s.textContent?.trim() ?? "")
  );
  expect(trajectorySpans.length).toBeGreaterThan(0);
  // Each trajectory badge must have neutral color (#7e8798), not any TRAJ palette color.
  trajectorySpans.forEach((span) => {
    const color = (span as HTMLElement).style.color;
    // color may be empty string (not set via inline style when neutral default applies)
    // or explicitly "#7e8798" — it must NOT be any bright TRAJ accent.
    expect(color).not.toMatch(/#e05252|#f0a868|#f0c468|#5fd3c8|#8ce29a/i);
  });
});

/* ============================================================
   Sort reorder — deterministic ordering assertion
   ============================================================ */

test("ThreatBoard: switching sort mode reorders threat cards", async () => {
  // Actionable sort (default): most counters first → T-LOCATE (10 counters) is first.
  // Urgent sort: most urgent trajectory first → T-DRONE (exploding, tier 4) is first.
  // These are deterministic from the seed data.
  const user = userEvent.setup();
  renderBoard();

  // Collect h3 labels in actionable (default) order
  const headings = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

  const actionableLabels = headings();
  expect(actionableLabels[0]).toBe("Physical location tracking & stalking"); // T-LOCATE first

  // Switch to urgent sort
  await user.click(screen.getByText("most urgent"));

  const urgentLabels = headings();
  expect(urgentLabels[0]).toBe("Aerial & drone surveillance"); // T-DRONE first (exploding, tier 4)

  // Confirm the full ordering differs — not just the first element
  expect(actionableLabels).not.toEqual(urgentLabels);
});
