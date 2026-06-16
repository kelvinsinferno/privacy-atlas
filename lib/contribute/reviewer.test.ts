import { describe, it, expect } from "vitest";
import { NoopReviewer, getReviewer, REVIEW_THRESHOLDS } from "./reviewer";
import type { ContributionWithStatus } from "./types";

const c = {
  id: "x", payload: { nodeKind: "move", label: "L" }, ts: 1, confirms: 9, flags: 0, status: "verified",
} as ContributionWithStatus;

describe("NoopReviewer", () => {
  it("skips everything (no AI yet)", async () => {
    const v = await new NoopReviewer().review(c);
    expect(v.verdict).toBe("skip");
    expect(v.reviewer).toBe("noop");
  });
});

describe("getReviewer", () => {
  it("defaults to NoopReviewer", () => {
    expect(getReviewer({}) instanceof NoopReviewer).toBe(true);
    expect(getReviewer({ MAINTAINER_REVIEWER: "manual" }) instanceof NoopReviewer).toBe(true);
  });
});

describe("REVIEW_THRESHOLDS", () => {
  it("exposes upvote/downvote trigger points the agent reads", () => {
    expect(REVIEW_THRESHOLDS.confirmsToReview).toBeGreaterThan(0);
    expect(REVIEW_THRESHOLDS.flagsToReview).toBeGreaterThan(0);
  });
});
