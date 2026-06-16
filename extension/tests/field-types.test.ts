import { describe, it, expect } from "vitest";
import { FIELD_CONTEXTS } from "../lib/field-types";

describe("field-types", () => {
  it("FIELD_CONTEXTS lists the four Phase-2 field contexts", () => {
    expect(FIELD_CONTEXTS).toEqual(["email", "payment", "phone", "address"]);
  });
});
