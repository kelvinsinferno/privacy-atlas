import { describe, it, expect } from "vitest";
import { doneIdsFromJourney } from "../lib/progress";

describe("doneIdsFromJourney", () => {
  it("returns ids whose value is truthy", () => {
    expect(doneIdsFromJourney('{"a":1,"b":0,"c":true}').sort()).toEqual(["a", "c"]);
  });
  it("returns [] for malformed json", () => {
    expect(doneIdsFromJourney("not json")).toEqual([]);
  });
  it("returns [] for null/empty", () => {
    expect(doneIdsFromJourney(null)).toEqual([]);
    expect(doneIdsFromJourney("")).toEqual([]);
  });
  it("returns [] for valid JSON that is not a plain object", () => {
    expect(doneIdsFromJourney("[true,false]")).toEqual([]);
    expect(doneIdsFromJourney("42")).toEqual([]);
    expect(doneIdsFromJourney('"x"')).toEqual([]);
  });
});
