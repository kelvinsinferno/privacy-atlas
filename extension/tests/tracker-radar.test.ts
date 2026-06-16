import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEAK_CLASSES } from "../constants";

const radar = JSON.parse(readFileSync(join(__dirname, "..", "data", "tracker-radar.min.json"), "utf8"));

describe("tracker-radar.min.json", () => {
  it("has entries", () => {
    expect(Object.keys(radar).length).toBeGreaterThan(300);
  });
  it("every entry has an entity and valid leak categories", () => {
    for (const [host, entry] of Object.entries(radar) as [string, { entity: string; categories: string[] }][]) {
      expect(entry.entity, host).toBeTruthy();
      expect(entry.categories.length, host).toBeGreaterThan(0);
      for (const c of entry.categories) expect(LEAK_CLASSES, `${host}:${c}`).toContain(c);
    }
  });
  it("contains well-known trackers with expected classifications", () => {
    expect(radar["doubleclick.net"]).toBeTruthy();
    expect(radar["google-analytics.com"]).toBeTruthy();
    expect(radar["clarity.ms"]).toBeTruthy();
    expect(radar["connect.facebook.net"]).toBeTruthy();
    expect(radar["connect.facebook.net"].categories).toContain("social");
  });
});
