import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEAK_CLASSES } from "../constants";

const leakMap = JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "leak-map.json"), "utf8"));
const graph = JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "graph.json"), "utf8"));
const threatIds = new Set(graph.threats.map((t: { id: string }) => t.id));

describe("leak-map.json", () => {
  it("covers every Phase-1 leak class", () => {
    for (const lc of LEAK_CLASSES) {
      expect(Object.keys(leakMap.categories)).toContain(lc);
    }
  });
  it("every mapped threat id exists in the graph", () => {
    const mapped = [
      ...Object.values(leakMap.categories).flat() as string[],
      ...Object.values(leakMap.behavioral).flat() as string[],
    ];
    for (const id of mapped) expect(threatIds.has(id)).toBe(true);
  });
  it("no leak class maps to an empty list", () => {
    for (const ids of Object.values(leakMap.categories) as string[][]) {
      expect(ids.length).toBeGreaterThan(0);
    }
  });
});
