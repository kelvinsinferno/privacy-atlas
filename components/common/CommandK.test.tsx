import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandK from "./CommandK";
import { buildModel } from "@/lib/model";
import { buildSearchIndex, searchEntries } from "@/lib/search";
import type { SearchEntry } from "@/lib/search";

const model = buildModel({});
const searchIndex = buildSearchIndex(model);

function renderPalette(onPick = vi.fn()) {
  return { onPick, ...render(<CommandK searchIndex={searchIndex} onPick={onPick} />) };
}

/* ------------------------------------------------------------------ */
/*  Initially closed                                                    */
/* ------------------------------------------------------------------ */

test("CommandK: palette is closed on mount (no input visible)", () => {
  renderPalette();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Search the whole site")).not.toBeInTheDocument();
});

/* ------------------------------------------------------------------ */
/*  Opening                                                             */
/* ------------------------------------------------------------------ */

test("CommandK: Ctrl+K opens the palette", () => {
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("Search the whole site")).toBeInTheDocument();
});

test("CommandK: Meta+K (⌘K) opens the palette", () => {
  renderPalette();
  fireEvent.keyDown(document, { key: "k", metaKey: true });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

/* ------------------------------------------------------------------ */
/*  Accessibility                                                       */
/* ------------------------------------------------------------------ */

test("CommandK: dialog has role=dialog and aria-modal", () => {
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
});

test("CommandK: input has aria-label 'Search the whole site'", () => {
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByLabelText("Search the whole site")).toBeInTheDocument();
});

test("CommandK: listbox has role=listbox", () => {
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByRole("listbox")).toBeInTheDocument();
});

/* ------------------------------------------------------------------ */
/*  Filtering — nodes                                                   */
/* ------------------------------------------------------------------ */

test("CommandK: typing 'password' shows 'Password manager' result", async () => {
  const user = userEvent.setup();
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByLabelText("Search the whole site");
  await user.type(input, "password");
  expect(screen.getByText("Password manager")).toBeInTheDocument();
});

test("CommandK: results have role=option", async () => {
  const user = userEvent.setup();
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByLabelText("Search the whole site");
  await user.type(input, "password");
  const options = screen.getAllByRole("option");
  expect(options.length).toBeGreaterThan(0);
});

test("CommandK: first result has aria-selected=true by default", async () => {
  const user = userEvent.setup();
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByLabelText("Search the whole site");
  await user.type(input, "password");
  const options = screen.getAllByRole("option");
  expect(options[0]).toHaveAttribute("aria-selected", "true");
});

test("CommandK: no-match query shows 'no matches'", async () => {
  const user = userEvent.setup();
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByLabelText("Search the whole site");
  await user.type(input, "xyzzy__no_match_ever");
  expect(screen.getByText("no matches")).toBeInTheDocument();
});

/* ------------------------------------------------------------------ */
/*  Keyboard navigation                                                  */
/* ------------------------------------------------------------------ */

test("CommandK: ArrowDown then Enter calls onPick with highlighted entry (nodeId in byId)", async () => {
  const user = userEvent.setup();
  const onPick = vi.fn();
  render(<CommandK searchIndex={searchIndex} onPick={onPick} />);

  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByLabelText("Search the whole site");
  await user.type(input, "p");

  // Navigate to index 1
  fireEvent.keyDown(input, { key: "ArrowDown" });
  const optionsAfter = screen.getAllByRole("option");
  expect(optionsAfter[1]).toHaveAttribute("aria-selected", "true");

  fireEvent.keyDown(input, { key: "Enter" });
  expect(onPick).toHaveBeenCalledTimes(1);

  const entry = onPick.mock.calls[0][0] as SearchEntry;
  // Must be a valid SearchEntry with either nodeId in byId or a tab
  if (entry.nodeId) {
    expect(model.byId.has(entry.nodeId)).toBe(true);
  } else {
    expect(entry.tab).toBeTruthy();
  }
});

/* ------------------------------------------------------------------ */
/*  Click selects a result                                              */
/* ------------------------------------------------------------------ */

test("CommandK: clicking Password manager calls onPick with nodeId=password-manager and closes palette", async () => {
  const user = userEvent.setup();
  const onPick = vi.fn();
  render(<CommandK searchIndex={searchIndex} onPick={onPick} />);

  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByLabelText("Search the whole site");
  await user.type(input, "password");

  const passwordOption = screen.getByText("Password manager");
  await user.click(passwordOption);

  expect(onPick).toHaveBeenCalledTimes(1);
  const entry = onPick.mock.calls[0][0] as SearchEntry;
  expect(entry.nodeId).toBe("password-manager");
  expect(entry.kind).toBe("move");
  // Palette closes
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

/* ------------------------------------------------------------------ */
/*  Resource / tool search                                              */
/* ------------------------------------------------------------------ */

test("CommandK: searching 'Bitwarden' returns a resource entry pointing at password-manager node", async () => {
  // Bitwarden is listed under RESOURCES["password-manager"] in data/resources.ts.
  // We must assert kind==="resource" (not a move whose summary contains "Bitwarden")
  // and the correct nodeId that data actually places it under.
  const resourceHit = searchIndex.find(
    (e) => e.kind === "resource" && e.label === "Bitwarden",
  );
  expect(resourceHit).toBeTruthy();
  expect(resourceHit!.kind).toBe("resource");
  expect(resourceHit!.nodeId).toBe("password-manager");
});

test("CommandK: searching 'YubiKey' returns a resource entry pointing at strong-2fa node", async () => {
  // YubiKey (5 series) is listed under RESOURCES["strong-2fa"] in data/resources.ts.
  const resourceHit = searchIndex.find(
    (e) => e.kind === "resource" && e.label === "YubiKey (5 series)",
  );
  expect(resourceHit).toBeTruthy();
  expect(resourceHit!.kind).toBe("resource");
  expect(resourceHit!.nodeId).toBe("strong-2fa");
});

test("CommandK: searching 'Bitwarden' via palette finds resource (not a move false-positive)", async () => {
  // searchEntries must surface the resource entry with kind==="resource"
  // even if a move entry's haystack/summary also contains "bitwarden".
  const results = searchEntries(searchIndex, "Bitwarden");
  const resourceEntry = results.find((e) => e.kind === "resource" && e.label === "Bitwarden");
  expect(resourceEntry).toBeTruthy();
  expect(resourceEntry!.nodeId).toBe("password-manager");
});

/* ------------------------------------------------------------------ */
/*  Section navigation                                                  */
/* ------------------------------------------------------------------ */

test("CommandK: searching 'contribute' includes a section entry with tab=contribute", async () => {
  const user = userEvent.setup();
  const onPick = vi.fn();
  render(<CommandK searchIndex={searchIndex} onPick={onPick} />);

  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByLabelText("Search the whole site");
  await user.type(input, "contribute");

  const options = screen.getAllByRole("option");
  expect(options.length).toBeGreaterThan(0);

  // Find and click the section entry
  await user.click(options[0]);
  const entry = onPick.mock.calls[0][0] as SearchEntry;
  // The first result should be the "Contribute" section (startsWith match on label)
  expect(entry.kind).toBe("section");
  expect(entry.tab).toBe("contribute");
});

/* ------------------------------------------------------------------ */
/*  Escape closes                                                       */
/* ------------------------------------------------------------------ */

test("CommandK: Escape closes the palette", () => {
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("CommandK: Escape on input closes the palette", async () => {
  const user = userEvent.setup();
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByLabelText("Search the whole site");
  await user.type(input, "p");
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

/* ------------------------------------------------------------------ */
/*  Toggle closed                                                       */
/* ------------------------------------------------------------------ */

test("CommandK: second Ctrl+K toggles palette closed", () => {
  renderPalette();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
