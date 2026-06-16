import { expect, test, describe } from "vitest";
import { buildSearchIndex, searchEntries } from "./search";
import { buildModel } from "./model";

const model = buildModel({});
const index = buildSearchIndex(model);

/* ------------------------------------------------------------------ */
/*  Index structure                                                     */
/* ------------------------------------------------------------------ */

describe("buildSearchIndex — index contents", () => {
  test("contains a 'move' entry for password-manager", () => {
    const e = index.find((x) => x.kind === "move" && x.nodeId === "password-manager");
    expect(e).toBeTruthy();
    expect(e!.label).toBe("Password manager");
    expect(e!.sub).toMatch(/move/i);
  });

  test("contains a 'threat' entry (T-BROKER)", () => {
    const e = index.find((x) => x.kind === "threat" && x.nodeId === "T-BROKER");
    expect(e).toBeTruthy();
    expect(e!.diamond).toBe(true);
    expect(e!.sub).toBe("threat");
  });

  test("contains a 'resource' entry with label 'Mullvad VPN' pointing at network-privacy node", () => {
    const e = index.find((x) => x.kind === "resource" && x.label === "Mullvad VPN");
    expect(e).toBeTruthy();
    expect(e!.nodeId).toBe("network-privacy");
    expect(e!.sub).toContain("network");
  });

  test("contains a 'resource' entry for 'Bitwarden' under password-manager node", () => {
    // Bitwarden is in RESOURCES["password-manager"] — verify resource→node routing.
    const e = index.find((x) => x.kind === "resource" && x.label === "Bitwarden");
    expect(e).toBeTruthy();
    expect(e!.kind).toBe("resource");
    expect(e!.nodeId).toBe("password-manager");
  });

  test("contains a 'resource' entry for 'YubiKey (5 series)' under strong-2fa node", () => {
    // YubiKey is in RESOURCES["strong-2fa"] — verify resource→node routing.
    const e = index.find((x) => x.kind === "resource" && x.label === "YubiKey (5 series)");
    expect(e).toBeTruthy();
    expect(e!.kind).toBe("resource");
    expect(e!.nodeId).toBe("strong-2fa");
  });

  test("contains a 'mission' entry for 'Lock the foundations'", () => {
    const e = index.find((x) => x.kind === "mission" && x.label === "Lock the foundations");
    expect(e).toBeTruthy();
    expect(e!.tab).toBe("journeys");
  });

  test("contains a 'look' entry for 'The Traveler'", () => {
    const e = index.find((x) => x.kind === "look" && x.label === "The Traveler");
    expect(e).toBeTruthy();
    expect(e!.tab).toBe("outfitted");
  });

  test("contains all 6 section entries", () => {
    const sections = index.filter((x) => x.kind === "section");
    expect(sections.length).toBe(6);
    const tabs = sections.map((s) => s.tab);
    expect(tabs).toContain("map");
    expect(tabs).toContain("journeys");
    expect(tabs).toContain("threats");
    expect(tabs).toContain("outfitted");
    expect(tabs).toContain("contribute");
    expect(tabs).toContain("path");
  });
});

/* ------------------------------------------------------------------ */
/*  searchEntries — basic matching                                      */
/* ------------------------------------------------------------------ */

describe("searchEntries — basic matching", () => {
  test("empty query returns []", () => {
    expect(searchEntries(index, "")).toEqual([]);
    expect(searchEntries(index, "   ")).toEqual([]);
  });

  test("finds Mullvad VPN by tool name", () => {
    const results = searchEntries(index, "Mullvad");
    const hit = results.find((e) => e.label === "Mullvad VPN");
    expect(hit).toBeTruthy();
    expect(hit!.kind).toBe("resource");
    expect(hit!.nodeId).toBe("network-privacy");
  });

  test("finds Bitwarden by tool name as a resource entry (not a move false-positive)", () => {
    // Searching "Bitwarden" must surface a resource entry routing to password-manager,
    // immune to a move entry whose haystack/summary might contain the word.
    const results = searchEntries(index, "Bitwarden");
    const hit = results.find((e) => e.kind === "resource" && e.label === "Bitwarden");
    expect(hit).toBeTruthy();
    expect(hit!.kind).toBe("resource");
    expect(hit!.nodeId).toBe("password-manager");
  });

  test("finds a mission by label", () => {
    const results = searchEntries(index, "Lock the foundations");
    const hit = results.find((e) => e.kind === "mission");
    expect(hit).toBeTruthy();
    expect(hit!.label).toBe("Lock the foundations");
  });

  test("finds The Traveler look by 'Traveler'", () => {
    const results = searchEntries(index, "Traveler");
    const hit = results.find((e) => e.kind === "look");
    expect(hit).toBeTruthy();
    expect(hit!.label).toBe("The Traveler");
    expect(hit!.tab).toBe("outfitted");
  });

  test("finds Outfitted section by 'outfitted'", () => {
    const results = searchEntries(index, "outfitted");
    const section = results.find((e) => e.kind === "section" && e.tab === "outfitted");
    expect(section).toBeTruthy();
  });

  test("finds Contribute section by 'contribute'", () => {
    const results = searchEntries(index, "contribute");
    const section = results.find((e) => e.kind === "section" && e.tab === "contribute");
    expect(section).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  searchEntries — summary / haystack matching                        */
/* ------------------------------------------------------------------ */

describe("searchEntries — summary text matching", () => {
  test("'cascade' (in unique-passwords summary, not in label) returns the unique-passwords move entry", () => {
    // unique-passwords summary: "A different random password per account so one breach can't cascade."
    // The word 'cascade' does NOT appear in the label "Unique passwords everywhere"
    const results = searchEntries(index, "cascade");
    const hit = results.find((e) => e.nodeId === "unique-passwords");
    expect(hit).toBeTruthy();
    expect(hit!.kind).toBe("move");
  });
});

/* ------------------------------------------------------------------ */
/*  searchEntries — ranking                                             */
/* ------------------------------------------------------------------ */

describe("searchEntries — ranking", () => {
  test("label-startsWith match ranks before sub/haystack-only match", () => {
    // "password" prefix-matches "Password manager" label
    // and also matches haystack of other entries (e.g. entries that mention password)
    const results = searchEntries(index, "password");
    expect(results.length).toBeGreaterThan(0);
    // The first result should be a label-startsWith match
    const first = results[0];
    expect(first.label.toLowerCase().startsWith("password")).toBe(true);
  });

  test("results capped at limit (default 12)", () => {
    // "e" matches almost everything — must be capped
    const results = searchEntries(index, "e");
    expect(results.length).toBeLessThanOrEqual(12);
  });

  test("custom limit is respected", () => {
    const results = searchEntries(index, "e", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });
});
