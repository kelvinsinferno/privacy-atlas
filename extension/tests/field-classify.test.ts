import { describe, it, expect } from "vitest";
import { classifyField } from "../lib/field-classify";
import type { FieldMeta } from "../lib/field-types";

const meta = (over: Partial<FieldMeta> = {}): FieldMeta => ({
  autocomplete: "", type: "text", name: "", id: "", placeholder: "", ariaLabel: "",
  disabled: false, readOnly: false, hidden: false, ...over,
});

describe("classifyField (metadata only)", () => {
  it("autocomplete tokens win", () => {
    expect(classifyField(meta({ autocomplete: "email" }))).toBe("email");
    expect(classifyField(meta({ autocomplete: "cc-number" }))).toBe("payment");
    expect(classifyField(meta({ autocomplete: "shipping tel" }))).toBe("phone");
    expect(classifyField(meta({ autocomplete: "street-address" }))).toBe("address");
    expect(classifyField(meta({ autocomplete: "postal-code" }))).toBe("address");
  });
  it("type fallback", () => {
    expect(classifyField(meta({ type: "email" }))).toBe("email");
    expect(classifyField(meta({ type: "tel" }))).toBe("phone");
  });
  it("keyword heuristics on name/id/placeholder/aria-label", () => {
    expect(classifyField(meta({ name: "user_email" }))).toBe("email");
    expect(classifyField(meta({ id: "cardNumber" }))).toBe("payment");
    expect(classifyField(meta({ placeholder: "Mobile phone" }))).toBe("phone");
    expect(classifyField(meta({ ariaLabel: "Street address" }))).toBe("address");
    expect(classifyField(meta({ name: "zip" }))).toBe("address");
  });
  it("skips password/search/hidden/disabled/readonly", () => {
    expect(classifyField(meta({ type: "password" }))).toBeNull();
    expect(classifyField(meta({ type: "search", name: "email" }))).toBeNull();
    expect(classifyField(meta({ type: "email", hidden: true }))).toBeNull();
    expect(classifyField(meta({ type: "email", disabled: true }))).toBeNull();
    expect(classifyField(meta({ type: "email", readOnly: true }))).toBeNull();
  });
  it("returns null when nothing matches (precision over recall)", () => {
    expect(classifyField(meta({ name: "username" }))).toBeNull();
    expect(classifyField(meta({ name: "q" }))).toBeNull();
    expect(classifyField(meta())).toBeNull();
  });
  it("does not treat bare 'address' (e.g. email address label) as the address field", () => {
    expect(classifyField(meta({ ariaLabel: "Email address" }))).toBe("email");
  });
  it("avoids false positives on look-alike substrings (precision)", () => {
    expect(classifyField(meta({ name: "streetwear_category" }))).toBeNull();
    expect(classifyField(meta({ id: "backstreet" }))).toBeNull();
    expect(classifyField(meta({ name: "gzip_enabled" }))).toBeNull();
    expect(classifyField(meta({ name: "discard" }))).toBeNull();
  });
  it("matches common fused field names (zipcode)", () => {
    expect(classifyField(meta({ name: "zipcode" }))).toBe("address");
    expect(classifyField(meta({ name: "zip_code" }))).toBe("address");
  });
});
