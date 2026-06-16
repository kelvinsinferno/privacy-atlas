import { describe, it, expect } from "vitest";
import { nodeToSeedPayload, howtoToSeedPayload, resourceToSeedPayload, sourceToSeedPayload } from "./seed";

describe("nodeToSeedPayload", () => {
  it("maps a move (failureMode → honesty, sources[0] → src, no rel)", () => {
    const p = nodeToSeedPayload({
      id: "threat-model", label: "Know your adversaries", domain: "foundation",
      summary: "Decide who you're guarding against.", failureMode: "Outdated model → wrong thing.",
      sources: [{ title: "EFF SSD", url: "https://ssd.eff.org/x", kind: "org" }],
    }, "move");
    expect(p).toEqual({
      nodeKind: "move", label: "Know your adversaries", domain: "foundation",
      summary: "Decide who you're guarding against.", honesty: "Outdated model → wrong thing.",
      src: { title: "EFF SSD", url: "https://ssd.eff.org/x" },
    });
    expect(p).not.toHaveProperty("rel");
  });
  it("maps a threat (residual → honesty)", () => {
    const p = nodeToSeedPayload({
      id: "T-BROKER", label: "Data-broker economy", domain: "digital",
      summary: "", residual: "Removal repopulates.", sources: [{ title: "Means of Control", url: "https://en.wikipedia.org/wiki/x", kind: "reference" }],
    }, "threat");
    expect(p.nodeKind).toBe("threat");
    expect(p.honesty).toBe("Removal repopulates.");
    expect(p.label).toBe("Data-broker economy");
    expect(p.src).toEqual({ title: "Means of Control", url: "https://en.wikipedia.org/wiki/x" });
  });
  it("omits src + honesty when absent", () => {
    const p = nodeToSeedPayload({ id: "x", label: "L", domain: "digital" }, "move");
    expect(p.src).toBeUndefined();
    expect(p.honesty).toBeUndefined();
  });
});

describe("howtoToSeedPayload", () => {
  it("maps a seed how-to to a howto payload", () => {
    const p = howtoToSeedPayload("device-disposal", { platform: "Phones", steps: ["a", "b"] });
    expect(p).toEqual({ kind: "howto", targetId: "device-disposal", platform: "Phones", steps: ["a", "b"] });
  });
});

describe("resourceToSeedPayload", () => {
  it("maps a tool/free resource to a link", () => {
    expect(resourceToSeedPayload("device-disposal", { name: "ShredOS", url: "https://x.org", type: "free", forStep: "wipe" }))
      .toEqual({ kind: "resource", targetId: "device-disposal", name: "ShredOS", url: "https://x.org", forStep: "wipe", resourceType: "link" });
  });
  it("maps a product/service to resourceType product", () => {
    expect(resourceToSeedPayload("x", { name: "P", url: "https://p.com", type: "product" }).resourceType).toBe("product");
    expect(resourceToSeedPayload("x", { name: "S", url: "https://s.com", type: "service" }).resourceType).toBe("product");
  });
});

describe("sourceToSeedPayload", () => {
  it("maps a node source", () => {
    expect(sourceToSeedPayload("T-BROKER", { title: "EFF", url: "https://eff.org", kind: "org" }))
      .toEqual({ kind: "source", targetId: "T-BROKER", title: "EFF", url: "https://eff.org", sourceKind: "org" });
  });
});
