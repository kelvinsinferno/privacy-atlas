import { expect, test } from "vitest";
import { GRAPH } from "./graph";
import { HOWTOS } from "./howtos";
import { RESOURCES } from "./resources";

test("HOWTOS cover every node (HANDOFF §2: 101/101)", () => {
  const missing = GRAPH.nodes.filter((n) => !(n.id in HOWTOS)).map((n) => n.id);
  expect(missing).toEqual([]);
});
test("RESOURCES cover every node (101/101)", () => {
  const missing = GRAPH.nodes.filter((n) => !(n.id in RESOURCES)).map((n) => n.id);
  expect(missing).toEqual([]);
});
