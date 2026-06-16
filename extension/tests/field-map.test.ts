import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIELD_CONTEXTS } from "../lib/field-types";

const fieldMap = JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "field-map.json"), "utf8"));
const graph = JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "graph.json"), "utf8"));
const moveIds = new Set(graph.nodes.map((n: { id: string }) => n.id));
const sub = JSON.parse(readFileSync(join(__dirname, "..", "data", "graph-subset.json"), "utf8"));

describe("field-map.json", () => {
  it("maps every field context", () => {
    for (const fc of FIELD_CONTEXTS) {
      expect(Object.keys(fieldMap)).toContain(fc);
      expect(fieldMap[fc].length).toBeGreaterThan(0);
    }
  });
  it("every mapped move id exists in the graph", () => {
    for (const ids of Object.values(fieldMap) as string[][]) {
      for (const id of ids) expect(moveIds.has(id)).toBe(true);
    }
  });
  it("every mapped move is present in the bundled graph subset (renderable)", () => {
    for (const ids of Object.values(fieldMap) as string[][]) {
      for (const id of ids) expect(sub.moves[id], id).toBeTruthy();
    }
  });
});
