import { describe, it, expect } from "vitest";
import { decide, defaultSettings } from "../lib/alert-engine";
import type { GraphSubset, Settings, ThreatHit } from "../lib/types";

const graph: GraphSubset = {
  threats: {
    "T-FINGERPRINT": { id: "T-FINGERPRINT", label: "Browser fingerprinting", residual: "…", counters: ["anti-fingerprint-browser"] },
    "T-TELEMETRY": { id: "T-TELEMETRY", label: "Telemetry", residual: "…", counters: ["disable-telemetry"] },
  },
  moves: {
    "anti-fingerprint-browser": { id: "anti-fingerprint-browser", label: "Use a fingerprint-resistant browser", summary: "…", domain: "digital" },
    "disable-telemetry": { id: "disable-telemetry", label: "Turn off telemetry", summary: "…", domain: "digital" },
  },
};

// Extended graph for cap tests (4 threats).
const graph4: GraphSubset = {
  threats: {
    "T-FINGERPRINT": { id: "T-FINGERPRINT", label: "Browser fingerprinting", residual: "…", counters: ["anti-fingerprint-browser"] },
    "T-TELEMETRY":   { id: "T-TELEMETRY",   label: "Telemetry",              residual: "…", counters: ["disable-telemetry"] },
    "T-SOCIAL":      { id: "T-SOCIAL",       label: "Social tracking",        residual: "…", counters: ["block-social"] },
    "T-REPLAY":      { id: "T-REPLAY",       label: "Session replay",         residual: "…", counters: ["block-replay"] },
  },
  moves: {
    "anti-fingerprint-browser": { id: "anti-fingerprint-browser", label: "Use a fingerprint-resistant browser", summary: "…", domain: "digital" },
    "disable-telemetry":        { id: "disable-telemetry",        label: "Turn off telemetry",                  summary: "…", domain: "digital" },
    "block-social":             { id: "block-social",             label: "Block social widgets",                summary: "…", domain: "digital" },
    "block-replay":             { id: "block-replay",             label: "Block session replay",                summary: "…", domain: "digital" },
  },
};
const base = (over: Partial<Settings> = {}): Settings => ({ ...defaultSettings(), ...over });
const fpHit: ThreatHit = { threatId: "T-FINGERPRINT", leakClass: "fingerprinting" };
const telHit: ThreatHit = { threatId: "T-TELEMETRY", leakClass: "analytics" };
const ctx = { settings: base(), currentHost: "shop.example", graph, atlasUrl: "https://privacyatlas.xyz" };

describe("decide", () => {
  it("adopt mode when no counter-move is done", () => {
    const r = decide({ ...ctx, hits: [fpHit], doneMoveIds: new Set() });
    expect(r.toasts).toHaveLength(1);
    expect(r.toasts[0]!.mode).toBe("adopt");
    expect(r.toasts[0]!.moves[0]!.id).toBe("anti-fingerprint-browser");
    expect(r.toasts[0]!.deepLink).toBe("https://privacyatlas.xyz/?threat=T-FINGERPRINT");
    expect(r.badge).toBe(1);
  });
  it("apply mode when a counter-move is already done", () => {
    const r = decide({ ...ctx, hits: [fpHit], doneMoveIds: new Set(["anti-fingerprint-browser"]) });
    expect(r.toasts[0]!.mode).toBe("apply");
    expect(r.badge).toBe(1);
  });
  it("suppresses the toast but still counts the badge when the type is toggled off", () => {
    const r = decide({ ...ctx, hits: [fpHit], doneMoveIds: new Set(), settings: base({ perTypeEnabled: { ...defaultSettings().perTypeEnabled, fingerprinting: false } }) });
    expect(r.toasts).toHaveLength(0);
    expect(r.badge).toBe(1);
  });
  it("suppresses all toasts when the site is muted", () => {
    const r = decide({ ...ctx, hits: [fpHit, telHit], doneMoveIds: new Set(), settings: base({ perSiteMutes: ["shop.example"] }) });
    expect(r.toasts).toHaveLength(0);
    expect(r.badge).toBe(2);
  });
  it("auto-quiets a type after 3 dismissals (badge still counts)", () => {
    const r = decide({ ...ctx, hits: [fpHit], doneMoveIds: new Set(), settings: base({ dismissals: { ...defaultSettings().dismissals, fingerprinting: 3 } }) });
    expect(r.toasts).toHaveLength(0);
    expect(r.badge).toBe(1);
  });
  it("suppresses all toasts when on-page alerts are globally disabled (badge still counts)", () => {
    const r = decide({ ...ctx, hits: [fpHit, telHit], doneMoveIds: new Set(), settings: base({ toastsEnabled: false }) });
    expect(r.toasts).toHaveLength(0);
    expect(r.overflow).toHaveLength(0);
    expect(r.all).toHaveLength(2);
    expect(r.badge).toBe(2);
  });
  it("badge counts distinct threats; multiple classes produce multiple toasts", () => {
    const r = decide({ ...ctx, hits: [fpHit, telHit], doneMoveIds: new Set() });
    expect(r.badge).toBe(2);
    expect(r.toasts).toHaveLength(2);
    expect(r.overflow).toEqual([]);
  });
  it("returns every detected threat in `all` regardless of suppression", () => {
    const r = decide({ ...ctx, hits: [fpHit, telHit], doneMoveIds: new Set(), settings: base({ perSiteMutes: ["shop.example"] }) });
    expect(r.toasts).toHaveLength(0);
    expect(r.all).toHaveLength(2);
    expect(r.all[0]!.mode).toMatch(/^(adopt|apply)$/);
    expect(r.all[0]!.moves.length).toBeGreaterThan(0);
  });
  it("all includes a suppressed (toggled-off) type", () => {
    const r = decide({ ...ctx, hits: [fpHit, telHit], doneMoveIds: new Set(), settings: base({ perTypeEnabled: { ...defaultSettings().perTypeEnabled, fingerprinting: false } }) });
    // fingerprinting is toggled off → absent from toasts but present in all
    expect(r.toasts.some((t) => t.leakClass === "fingerprinting")).toBe(false);
    expect(r.all.some((t) => t.leakClass === "fingerprinting")).toBe(true);
    expect(r.all).toHaveLength(2);
  });

  it("caps on-page toasts to 3 and returns overflow array for expansion", () => {
    const hits: ThreatHit[] = [
      { threatId: "T-FINGERPRINT", leakClass: "fingerprinting" },
      { threatId: "T-TELEMETRY",   leakClass: "analytics" },
      { threatId: "T-SOCIAL",      leakClass: "social" },
      { threatId: "T-REPLAY",      leakClass: "session-replay" },
    ];
    const ctx4 = { settings: base(), currentHost: "tracker-heavy.example", graph: graph4, atlasUrl: "https://privacyatlas.xyz" };
    const r = decide({ ...ctx4, hits, doneMoveIds: new Set() });
    expect(r.toasts).toHaveLength(3);
    expect(r.overflow).toHaveLength(1);
    expect(r.all).toHaveLength(4);
    expect(r.badge).toBe(4);
  });
});
