import { describe, it, expect } from "vitest";
import { classify } from "../lib/classifier";
import type { LeakMap, TrackerRadar } from "../lib/types";

const radar: TrackerRadar = {
  "google-analytics.com": { entity: "Google LLC", categories: ["analytics"] },
  "static.hotjar.com": { entity: "Hotjar Ltd.", categories: ["session-replay"] },
};
const leakMap: LeakMap = {
  categories: {
    advertising: ["T-BIDSTREAM"],
    analytics: ["T-TELEMETRY", "T-INFERENCE"],
    fingerprinting: ["T-FINGERPRINT"],
    "session-replay": ["T-BEHAVIORAL-DIGITAL"],
    social: ["T-BROKER"],
  },
  behavioral: { "canvas.toDataURL": ["T-FINGERPRINT"] },
};

describe("classify", () => {
  it("maps a known analytics host to its threats", () => {
    const hits = classify([{ kind: "resource", value: "google-analytics.com" }], leakMap, radar);
    expect(hits.map((h) => h.threatId).sort()).toEqual(["T-INFERENCE", "T-TELEMETRY"]);
    expect(hits[0]!.leakClass).toBe("analytics");
    expect(hits[0]!.entity).toBe("Google LLC");
  });
  it("maps a behavioral signal to fingerprinting", () => {
    const hits = classify([{ kind: "behavioral", value: "canvas.toDataURL" }], leakMap, radar);
    expect(hits).toEqual([{ threatId: "T-FINGERPRINT", leakClass: "fingerprinting", entity: undefined }]);
  });
  it("ignores unknown hosts", () => {
    expect(classify([{ kind: "resource", value: "example.com" }], leakMap, radar)).toEqual([]);
  });
  it("dedupes the same threat from multiple signals", () => {
    const hits = classify(
      [
        { kind: "resource", value: "google-analytics.com" },
        { kind: "resource", value: "google-analytics.com" },
      ],
      leakMap, radar,
    );
    expect(hits.filter((h) => h.threatId === "T-TELEMETRY").length).toBe(1);
  });
  it("matches a host suffix (subdomain of a known tracker)", () => {
    const hits = classify([{ kind: "resource", value: "ssl.google-analytics.com" }], leakMap, radar);
    expect(hits.some((h) => h.threatId === "T-TELEMETRY")).toBe(true);
  });
  it("does not match a host that shares a suffix but is not a subdomain", () => {
    const hits = classify([{ kind: "resource", value: "evil-google-analytics.com" }], leakMap, radar);
    expect(hits).toEqual([]);
  });
  it("matches a deep multi-label subdomain via registrable-domain walk", () => {
    const hits = classify([{ kind: "resource", value: "a.b.c.google-analytics.com" }], leakMap, radar);
    expect(hits.some((h) => h.threatId === "T-TELEMETRY")).toBe(true);
  });
});
