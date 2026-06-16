import { expect, test } from "vitest";
import { GRAPH } from "./graph";

test("graph loads with expected seed counts", () => {
  expect(GRAPH.nodes.length).toBe(101);
  expect(GRAPH.threats.length).toBe(33);
  expect(GRAPH.edges.length).toBe(307);
});

test("a known node resolves and has required honesty fields", () => {
  const n = GRAPH.nodes.find((x) => x.id === "password-manager");
  expect(n).toBeTruthy();
  expect(Array.isArray(n!.sources)).toBe(true);
});
