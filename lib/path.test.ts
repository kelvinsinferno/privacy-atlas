import { expect, test, describe, it } from "vitest";
import { buildPath, prereqChain, phoneStatus } from "./path";
import { buildModel } from "./model";

// buildPath returns PathEntry[] where each entry has a .node (Node), .score,
// .urgency, .counters, and .assumedDone — NOT plain id strings.
// Profile shape: { worry, friction, level, actors? (optional) }
// Valid worry values: "brokers" | "person" | "crime" | "state" | "broad"

test("buildPath returns a non-empty dependency-ordered sequence", () => {
  const p = buildPath({ worry: "brokers", friction: "med", level: "beginner" });
  expect(p.length).toBeGreaterThan(0);
  // no duplicate node ids
  const ids = p.map((e) => e.node.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("foundation-critical moves appear early — non-vacuous", () => {
  // password-manager: domain=foundation, tier=1, cost.friction="low"
  // A low-friction beginner profile MUST include it (friction cap=1 >= node friction=1)
  const p = buildPath({ worry: "person", friction: "low", level: "beginner" });
  const ids = p.map((e) => e.node.id);
  const pmIdx = ids.findIndex((id) => id === "password-manager");

  // Assert password-manager IS present — it must survive the friction filter
  // (its cost.friction is "low" which equals the cap for friction:"low" profiles)
  expect(pmIdx).toBeGreaterThanOrEqual(0);

  // Assert it appears in the front half — tier-1 foundation nodes get an orderVal
  // boost of 8 (domain=foundation) + (6-1)*1.6=8 = 16 on top of score
  expect(pmIdx).toBeLessThan(ids.length / 2);
});

test("each PathEntry has required fields", () => {
  const p = buildPath({ worry: "crime", friction: "high", level: "beginner" });
  expect(p.length).toBeGreaterThan(0);
  const first = p[0];
  expect(first).toHaveProperty("node");
  expect(first).toHaveProperty("score");
  expect(first).toHaveProperty("urgency");
  expect(first).toHaveProperty("counters");
  expect(first).toHaveProperty("assumedDone");
  expect(typeof first.node.id).toBe("string");
  expect(typeof first.score).toBe("number");
});

test("advanced level skips tier-1 foundation nodes", () => {
  const beg = buildPath({ worry: "broad", friction: "high", level: "beginner" });
  const adv = buildPath({ worry: "broad", friction: "high", level: "advanced" });
  // advanced profile pre-marks foundation tier-1 as done so fewer nodes are in seq
  const begFoundationT1 = beg.filter(
    (e) => e.node.domain === "foundation" && e.node.tier === 1
  ).length;
  const advFoundationT1 = adv.filter(
    (e) => e.node.domain === "foundation" && e.node.tier === 1
  ).length;
  expect(advFoundationT1).toBeLessThan(begFoundationT1);
});

test("friction cap filters out high-friction nodes for low-friction profile", () => {
  const p = buildPath({ worry: "brokers", friction: "low", level: "beginner" });
  // No node in results should have cost.friction > "low"
  const tooFrictional = p.filter(
    (e) => e.node.cost && (e.node.cost.friction === "med" || e.node.cost.friction === "high")
  );
  expect(tooFrictional).toHaveLength(0);
});

test("domains filter restricts results to the specified domain only", () => {
  // profile.domains = ["digital"] should exclude all non-digital nodes
  // foundation nodes are NOT force-included when a domains filter is set —
  // the filter is a plain includes() check with no carve-out (confirmed from source)
  const p = buildPath({ friction: "high", level: "beginner", domains: ["digital"] });

  // The result must be non-empty (there are 35 digital nodes at friction:"high")
  expect(p.length).toBeGreaterThan(0);

  // Every returned node must be in the allowed domain set
  const forbidden = p.filter((e) => !["digital"].includes(e.node.domain));
  expect(forbidden).toHaveLength(0);

  // Spot-check: at least one known digital node is present
  const ids = p.map((e) => e.node.id);
  const hasDigital = ids.some((id) =>
    ["email-aliasing", "encrypted-messaging", "network-privacy", "browser-hardening"].includes(id)
  );
  expect(hasDigital).toBe(true);
});

test("prereqChain returns ordered prereqs for a known node", () => {
  const model = buildModel(null);
  const chain = prereqChain("unique-passwords", model.links);
  expect(chain).toHaveProperty("set");
  expect(chain).toHaveProperty("order");
  expect(chain.set).toBeInstanceOf(Set);
  expect(Array.isArray(chain.order)).toBe(true);
});

test("prereqChain set contains all nodes in order array", () => {
  const model = buildModel(null);
  const chain = prereqChain("unique-passwords", model.links);
  chain.order.forEach((id: string) => {
    expect(chain.set.has(id)).toBe(true);
  });
});

test("prereqChain walks a real edge — unique-passwords depends on password-manager", () => {
  // Graph edge: password-manager -> unique-passwords (type: prereq)
  // Direction: from=password-manager (prerequisite), to=unique-passwords (dependent)
  // prereqChain(dependent, links) must surface the prerequisite
  const model = buildModel(null);
  const chain = prereqChain("unique-passwords", model.links);

  // The chain must be non-empty — unique-passwords has a real prereq
  expect(chain.order.length).toBeGreaterThan(0);

  // password-manager must be in both set and order
  expect(chain.set.has("password-manager")).toBe(true);
  expect(chain.order).toContain("password-manager");
});

describe("phoneStatus", () => {
  it("maps buckets to coarse support state", () => {
    expect(phoneStatus({ phoneAge: "4plus" })).toBe("atrisk");
    expect(phoneStatus({ phoneAge: "unknown" })).toBe("uncertain");
    expect(phoneStatus({ phoneAge: "lt2" })).toBe("ok");
    expect(phoneStatus({ phoneAge: "2to4" })).toBe("ok");
    expect(phoneStatus({})).toBe("none");
  });
});

describe("buildPath — device-age reorder", () => {
  it("top-ranks update-discipline when the phone is at-risk", () => {
    const path = buildPath({ friction: "high", level: "beginner", phoneAge: "4plus" });
    // the +100 PHONE_ATRISK_BOOST puts update-discipline far above any other orderVal → first
    expect(path[0]?.node.id).toBe("update-discipline");
  });

  it("re-includes update-discipline for an advanced user when at-risk (normally skipped)", () => {
    const atRisk = buildPath({ friction: "high", level: "advanced", phoneAge: "4plus" });
    expect(atRisk.some((p) => p.node.id === "update-discipline")).toBe(true);
  });

  it("leaves the advanced skip intact when the phone is not at-risk", () => {
    const noPhone = buildPath({ friction: "high", level: "advanced" });
    expect(noPhone.some((p) => p.node.id === "update-discipline")).toBe(false);
  });
});
