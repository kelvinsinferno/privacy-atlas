/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { isPendingForReview } from "./queries";
import type { ContributionWithStatus } from "@/lib/contribute/types";

const c = (over: Partial<ContributionWithStatus>): ContributionWithStatus => ({
  id: "x", kind: "resource", payload: { kind: "resource", targetId: "n", name: "N", url: "https://x", resourceType: "link" } as any,
  ts: 1, confirms: 0, flags: 0, status: "pending", badge: "none", reviewedBy: null, reviewedAt: null, reviewReason: null, reviewMeta: null,
  ...over,
});

describe("isPendingForReview", () => {
  it("includes unbadged community items (verify candidates)", () => {
    expect(isPendingForReview(c({ badge: "none" }))).toBe(true);
  });
  it("includes flagged items even if verified (reject/re-review candidates)", () => {
    expect(isPendingForReview(c({ badge: "verified", flags: 3 }))).toBe(true);
  });
  it("excludes a verified, un-flagged item", () => {
    expect(isPendingForReview(c({ badge: "verified", flags: 0 }))).toBe(false);
  });
  it("excludes a verified item below the flag threshold", () => {
    expect(isPendingForReview(c({ badge: "verified", flags: 2 }))).toBe(false);
  });
});
