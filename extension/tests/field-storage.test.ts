import { describe, it, expect, beforeEach } from "vitest";
import { fakeBrowser } from "wxt/testing";
import { getSettings, recordFieldDismissal, fieldMuteSite } from "../lib/storage";

beforeEach(() => fakeBrowser.reset());

describe("field settings storage", () => {
  it("defaults: field suggestions enabled, no field mutes, zero field dismissals", async () => {
    const s = await getSettings();
    expect(s.fieldSuggestionsEnabled).toBe(true);
    expect(s.fieldMutedSites).toEqual([]);
    expect(s.fieldDismissals.email).toBe(0);
  });
  it("recordFieldDismissal increments the per-context counter", async () => {
    await recordFieldDismissal("payment");
    await recordFieldDismissal("payment");
    const s = await getSettings();
    expect(s.fieldDismissals.payment).toBe(2);
  });
  it("fieldMuteSite adds a host once (idempotent)", async () => {
    await fieldMuteSite("shop.example");
    await fieldMuteSite("shop.example");
    const s = await getSettings();
    expect(s.fieldMutedSites).toEqual(["shop.example"]);
  });
});
