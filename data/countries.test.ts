import { describe, it, expect } from "vitest";
import { COUNTRIES, COUNTRY_BY_CODE, isCountryCode } from "./countries";

describe("countries reference data", () => {
  it("includes the major ISO 3166-1 alpha-2 codes", () => {
    for (const c of ["US", "GB", "DE", "FR", "CA", "AU", "JP", "BR", "IN", "ZA"]) {
      expect(isCountryCode(c)).toBe(true);
    }
  });
  it("is a substantial list with unique 2-letter uppercase codes", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(200);
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
  });
  it("each entry has a name and a flag; lookup works", () => {
    expect(COUNTRY_BY_CODE["DE"]?.name).toBe("Germany");
    expect(COUNTRY_BY_CODE["DE"]?.flag).toBeTruthy();
    expect(COUNTRY_BY_CODE["US"]?.name).toBe("United States");
    expect(COUNTRY_BY_CODE["US"]?.flag).toBe("🇺🇸");
  });
  it("rejects non-codes", () => {
    for (const x of ["", "U", "USA", "de", "12", "country:DE", undefined as unknown as string]) {
      expect(isCountryCode(x)).toBe(false);
    }
  });
});
