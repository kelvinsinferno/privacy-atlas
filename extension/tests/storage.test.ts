import { describe, it, expect, beforeEach } from "vitest";
import { fakeBrowser } from "wxt/testing";
import { getSettings, recordDismissal, getDoneMoveIds, muteSite, updateSettings } from "../lib/storage";

beforeEach(() => fakeBrowser.reset());

describe("storage", () => {
  it("returns default settings when nothing is stored", async () => {
    const s = await getSettings();
    expect(s.perTypeEnabled.fingerprinting).toBe(true);
    expect(s.perSiteMutes).toEqual([]);
  });
  it("records a dismissal, incrementing the per-type counter", async () => {
    await recordDismissal("analytics");
    await recordDismissal("analytics");
    const s = await getSettings();
    expect(s.dismissals.analytics).toBe(2);
  });
  it("reads mirrored progress as a set of move ids", async () => {
    await fakeBrowser.storage.local.set({ mirroredProgress: ["disable-telemetry"] });
    const done = await getDoneMoveIds();
    expect(done.has("disable-telemetry")).toBe(true);
  });
  it("muteSite adds a host once (idempotent)", async () => {
    await muteSite("example.com");
    await muteSite("example.com");
    const s = await getSettings();
    expect(s.perSiteMutes).toEqual(["example.com"]);
  });
  it("getDoneMoveIds returns an empty set when nothing is stored", async () => {
    const done = await getDoneMoveIds();
    expect(done.size).toBe(0);
  });
  it("merges a partial stored settings object over defaults", async () => {
    await fakeBrowser.storage.local.set({ settings: { perSiteMutes: ["foo.com"] } });
    const s = await getSettings();
    expect(s.perSiteMutes).toEqual(["foo.com"]);
    expect(s.perTypeEnabled.fingerprinting).toBe(true); // default preserved
    expect(s.dismissals.analytics).toBe(0);             // default preserved
  });
  it("serializes concurrent updates without losing writes", async () => {
    await Promise.all([
      updateSettings((s) => { s.dismissals.analytics = (s.dismissals.analytics ?? 0) + 1; }),
      updateSettings((s) => { s.perSiteMutes.push("a.com"); }),
      updateSettings((s) => { s.dismissals.analytics = (s.dismissals.analytics ?? 0) + 1; }),
    ]);
    const s = await getSettings();
    expect(s.dismissals.analytics).toBe(2);   // both increments applied (no clobber)
    expect(s.perSiteMutes).toEqual(["a.com"]);
  });
});
