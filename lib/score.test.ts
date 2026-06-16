import { expect, test } from "vitest";
import { computePrivacyScore, dueForRecheck, PRIVACY_CEILING } from "./score";
import { buildModel } from "./model";
import type { Node } from "@/lib/types";

test("empty progress scores 0%", () => {
  const m = buildModel({});
  expect(computePrivacyScore(m, {}).pct).toBe(0);
});
test("score never exceeds the ceiling even if everything is done", () => {
  const m = buildModel({});
  const allDone = Object.fromEntries(m.all.filter((n) => n.kind === "node").map((n) => [n.id, Date.now()]));
  // pct is a fraction on the 0..PRIVACY_CEILING scale, not an integer
  expect(computePrivacyScore(m, allDone).pct).toBeLessThanOrEqual(PRIVACY_CEILING);
  expect(computePrivacyScore(m, allDone).pct).toBeGreaterThan(0.5);
  // guard against integer regression: pct must never exceed 1
  expect(computePrivacyScore(m, allDone).pct).toBeLessThanOrEqual(1);
});
test("lab is a non-empty string", () => {
  const m = buildModel({});
  const allDone = Object.fromEntries(m.all.filter((n) => n.kind === "node").map((n) => [n.id, Date.now()]));
  const score = computePrivacyScore(m, allDone);
  expect(typeof score.lab).toBe("string");
  expect(score.lab.length).toBeGreaterThan(0);
});
test("a periodic node done 200 days ago is due for recheck", () => {
  const past = Date.now() - 200 * 864e5;
  const node: Pick<Node, "cost"> = { cost: { maintenance: "periodic", money: "none", friction: "none" } };
  expect(dueForRecheck(node, past)).toBe(true);
});
