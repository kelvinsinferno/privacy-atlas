import { describe, it, expect } from "vitest";
import { statusFor } from "./status";
import { entryStatus } from "@/lib/community";

describe("statusFor", () => {
  it("delegates to entryStatus with the entry id + tallies", () => {
    const id = "abc123";
    const confirms = 20, flags = 0;
    expect(statusFor(id, confirms, flags)).toBe(entryStatus({ id, confirms, flags }));
  });
  it("a fresh entry with no votes is pending", () => {
    expect(statusFor("xyz", 0, 0)).toBe("pending");
  });
  it("heavy confirms with no flags verifies", () => {
    expect(statusFor("xyz", 20, 0)).toBe("verified");
  });
  it("heavy flags reject", () => {
    expect(statusFor("xyz", 0, 20)).toBe("rejected");
  });
});
