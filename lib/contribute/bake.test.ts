import { describe, it, expect } from "vitest";
import { mergeVerifiedIntoGraph, pruneFromGraph } from "./bake";
import type { ContributionWithStatus } from "./types";

const baseGraph = () => ({ nodes: [{ id: "exposure-inventory" }], threats: [{ id: "T-BROKER" }], edges: [{ from: "a", to: "b", type: "counters" }] });
const verifiedMove: ContributionWithStatus = {
  id: "m1", kind: "node", ts: 1, confirms: 20, flags: 0, status: "verified", badge: "none",
  payload: { nodeKind: "move", label: "New move", domain: "digital", summary: "s", honesty: "h", rel: ["T-BROKER"], src: { url: "https://e.com", title: "E" } },
};

describe("mergeVerifiedIntoGraph", () => {
  it("adds a verified move as a community node with a counters edge", () => {
    const g = mergeVerifiedIntoGraph(baseGraph(), [verifiedMove]);
    const n = g.nodes.find((x: Record<string, unknown>) => x["id"] === "m1");
    expect(n).toBeTruthy();
    expect((n as { community?: boolean }).community).toBe(true);
    expect(g.edges.some((e: Record<string, unknown>) => e["from"] === "m1" && e["to"] === "T-BROKER")).toBe(true);
  });
  it("adds a verified threat as a community threat", () => {
    const g = mergeVerifiedIntoGraph(baseGraph(), [{ ...verifiedMove, id: "t1", payload: { ...verifiedMove.payload, nodeKind: "threat" } }]);
    expect(g.threats.some((x: Record<string, unknown>) => x["id"] === "t1")).toBe(true);
  });
  it("skips non-verified and already-present ids (idempotent)", () => {
    const g0 = baseGraph();
    const pending = { ...verifiedMove, status: "pending" as const };
    expect(mergeVerifiedIntoGraph(g0, [pending]).nodes.length).toBe(g0.nodes.length);
    const once = mergeVerifiedIntoGraph(baseGraph(), [verifiedMove]);
    const twice = mergeVerifiedIntoGraph(once, [verifiedMove]);
    expect(twice.nodes.filter((n: Record<string, unknown>) => n["id"] === "m1").length).toBe(1);
  });
  it("does not mutate the input graph (purity)", () => {
    const g0 = baseGraph();
    mergeVerifiedIntoGraph(g0, [verifiedMove]);
    expect(g0.nodes.length).toBe(1);
    expect(g0.threats.length).toBe(1);
    expect(g0.edges.length).toBe(1);
  });
  it("omits sources when the proposal has no src.url", () => {
    const noSrc = { ...verifiedMove, id: "m2", payload: { ...verifiedMove.payload, src: undefined } };
    const g = mergeVerifiedIntoGraph(baseGraph(), [noSrc]);
    const n = g.nodes.find((x: Record<string, unknown>) => x["id"] === "m2");
    expect((n as { sources?: unknown[] }).sources).toEqual([]);
  });
  it("orients a verified threat's counters edge as rel -> threat", () => {
    const threat = { ...verifiedMove, id: "t2", payload: { ...verifiedMove.payload, nodeKind: "threat" as const, rel: ["exposure-inventory"] } };
    const g = mergeVerifiedIntoGraph(baseGraph(), [threat]);
    expect(g.edges.some((e: Record<string, unknown>) => e["from"] === "exposure-inventory" && e["to"] === "t2")).toBe(true);
  });
});

describe("pruneFromGraph", () => {
  const g = () => ({
    nodes: [{ id: "keep" }, { id: "drop" }],
    threats: [{ id: "T-keep" }, { id: "T-drop" }],
    edges: [
      { from: "keep", to: "T-keep", type: "counters" },
      { from: "drop", to: "T-keep", type: "counters" },
      { from: "keep", to: "T-drop", type: "counters" },
    ],
  });
  it("removes nodes/threats with the given ids", () => {
    const r = pruneFromGraph(g(), ["drop", "T-drop"]);
    expect(r.nodes.map((n: Record<string, unknown>) => n["id"])).toEqual(["keep"]);
    expect(r.threats.map((n: Record<string, unknown>) => n["id"])).toEqual(["T-keep"]);
  });
  it("drops every edge touching a removed id", () => {
    const r = pruneFromGraph(g(), ["drop", "T-drop"]);
    expect(r.edges).toEqual([{ from: "keep", to: "T-keep", type: "counters" }]);
  });
  it("is a no-op for unknown ids + does not mutate the input", () => {
    const input = g();
    const r = pruneFromGraph(input, ["nope"]);
    expect(r.nodes.length).toBe(2);
    expect(input.nodes.length).toBe(2);
  });
});
