import { describe, expect, test } from "vitest";
import { validateGraph } from "./validate-graph";
import { GRAPH } from "@/data/graph";

describe("validateGraph", () => {
  test("the canonical graph passes", () => {
    expect(validateGraph(GRAPH)).toEqual([]);
  });
  test("flags a node missing sources", () => {
    const g = structuredClone(GRAPH); g.nodes[0].sources = [];
    expect(validateGraph(g).some((e) => /sources/.test(e))).toBe(true);
  });
  test("flags a node missing both caveat and failureMode", () => {
    const g = structuredClone(GRAPH); g.nodes[0].caveat = undefined; g.nodes[0].failureMode = undefined;
    expect(validateGraph(g).some((e) => /caveat|failureMode/.test(e))).toBe(true);
  });
  test("flags a threat missing residual", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = structuredClone(GRAPH); (g.threats[0] as any).residual = undefined;
    expect(validateGraph(g).some((e) => /residual/.test(e))).toBe(true);
  });
  test("flags an unresolved edge", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = structuredClone(GRAPH); g.edges.push({ from: "nope", to: "nada", type: "prereq" } as any);
    expect(validateGraph(g).some((e) => /unresolved edge/.test(e))).toBe(true);
  });
  test("flags an over-long label", () => {
    const g = structuredClone(GRAPH); g.nodes[0].label = "x".repeat(49);
    expect(validateGraph(g).some((e) => /48 chars/.test(e))).toBe(true);
  });
  test("does not flag a long threat label (threats are exempt from the 48-char rule)", () => {
    const g = structuredClone(GRAPH); g.threats[0].label = "x".repeat(80);
    expect(validateGraph(g).some((e) => /48 chars/.test(e))).toBe(false);
  });
  test("flags a threat missing sources", () => {
    const g = structuredClone(GRAPH); g.threats[0].sources = [];
    expect(validateGraph(g).some((e) => /threat .*missing sources/.test(e))).toBe(true);
  });
});
