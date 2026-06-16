import { describe, it, expect } from "vitest";
import { LEAK_CLASSES, ATLAS_URL } from "../constants";

describe("constants", () => {
  it("LEAK_CLASSES has the five Phase-1 leak classes", () => {
    expect(LEAK_CLASSES).toEqual([
      "advertising", "analytics", "fingerprinting", "session-replay", "social",
    ]);
  });
  it("ATLAS_URL is the https atlas origin", () => {
    expect(ATLAS_URL).toBe("https://privacyatlas.xyz");
  });
});
