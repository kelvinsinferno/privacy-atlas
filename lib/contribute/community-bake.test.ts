import { describe, it, expect } from "vitest";
import { buildCommunityLayer } from "./community-bake";
import type { ContributionWithStatus, ContributionPayload } from "./types";

const c = (over: Partial<ContributionWithStatus> & { kind: ContributionWithStatus["kind"]; id: string; payload: ContributionPayload }): ContributionWithStatus =>
  ({ ts: 1, confirms: 0, flags: 0, status: "verified", badge: "verified", ...over } as ContributionWithStatus);

describe("buildCommunityLayer", () => {
  it("groups verified non-seed how-tos/resources/sources by targetId", () => {
    const out = buildCommunityLayer([
      c({ kind: "howto", id: "abc1", payload: { kind: "howto", targetId: "password-manager", platform: "iOS", steps: ["a"] } }),
      c({ kind: "resource", id: "abc2", payload: { kind: "resource", targetId: "device-disposal", name: "Tool", url: "https://x.org", resourceType: "link" } }),
      c({ kind: "source", id: "abc3", payload: { kind: "source", targetId: "T-BROKER", title: "EFF", url: "https://eff.org", sourceKind: "org" } }),
    ]);
    expect(out.howtos["password-manager"]).toEqual([{ id: "abc1", platform: "iOS", steps: ["a"] }]);
    expect(out.resources["device-disposal"]).toEqual([{ id: "abc2", name: "Tool", url: "https://x.org", resourceType: "link" }]);
    expect(out.sources["T-BROKER"]).toEqual([{ id: "abc3", title: "EFF", url: "https://eff.org", sourceKind: "org" }]);
  });
  it("excludes seed ids (howto:/res:/src: prefixes) and non-verified + wrong kinds", () => {
    const out = buildCommunityLayer([
      c({ kind: "howto", id: "howto:password-manager", payload: { kind: "howto", targetId: "password-manager", platform: "seed", steps: ["s"] } }),
      c({ kind: "resource", id: "res:device-disposal:0", payload: { kind: "resource", targetId: "device-disposal", name: "seed", url: "https://s.org", resourceType: "link" } }),
      c({ kind: "howto", id: "p1", badge: "none", payload: { kind: "howto", targetId: "x", platform: "pending", steps: ["s"] } }),
      c({ kind: "node", id: "n1", payload: { nodeKind: "move", label: "L" } }),
    ]);
    expect(out.howtos).toEqual({});
    expect(out.resources).toEqual({});
    expect(out.sources).toEqual({});
  });
  it("empty input → empty maps", () => {
    expect(buildCommunityLayer([])).toEqual({ howtos: {}, resources: {}, sources: {}, regions: {} });
  });
});

describe("buildCommunityLayer — regions", () => {
  it("groups verified region contributions by targetId", () => {
    const layer = buildCommunityLayer([
      c({ kind: "region", id: "r1", badge: "verified", payload: { kind: "region", targetId: "credit-freeze-big3", country: "DE", status: "different", note: "Use SCHUFA." } }),
      c({ kind: "region", id: "r2", badge: "verified", payload: { kind: "region", targetId: "credit-freeze-big3", country: "GB", status: "applies" } }),
    ]);
    expect(layer.regions["credit-freeze-big3"]).toHaveLength(2);
    expect(layer.regions["credit-freeze-big3"]!.map((r) => r.country).sort()).toEqual(["DE", "GB"]);
    expect(layer.regions["credit-freeze-big3"]![0]!.id).toBe("r1");
  });
  it("excludes non-verified region contributions", () => {
    const layer = buildCommunityLayer([
      c({ kind: "region", id: "r3", badge: "none", payload: { kind: "region", targetId: "x", country: "DE", status: "applies" } }),
    ]);
    expect(layer.regions["x"]).toBeUndefined();
  });
});
