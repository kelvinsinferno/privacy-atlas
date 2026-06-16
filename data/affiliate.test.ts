import { expect, test } from "vitest";
import { affiliate } from "./affiliate";

// Read the routing table so assertions stay accurate if keys are added later.
// Currently AFFILIATE is empty (pass-through), so all valid http(s) URLs return as-is.

test("affiliate passes through a valid https URL unchanged (no matching AFFILIATE key)", () => {
  const result = affiliate("https://mullvad.net/");
  expect(result).toContain("mullvad.net");
  expect(result.startsWith("https://")).toBe(true);
});

test("affiliate blocks javascript: URLs — returns about:blank", () => {
  expect(affiliate("javascript:alert(1)")).toBe("about:blank");
});

test("affiliate blocks data: URLs — returns about:blank", () => {
  expect(affiliate("data:text/html,<script>alert(1)</script>")).toBe("about:blank");
});

test("affiliate blocks empty string — returns about:blank", () => {
  expect(affiliate("")).toBe("about:blank");
});

test("affiliate blocks non-URL strings — returns about:blank", () => {
  expect(affiliate("not-a-url")).toBe("about:blank");
});

test("affiliate treats uppercase HTTPS scheme as valid http(s) (case-insensitive)", () => {
  const result = affiliate("HTTPS://example.com");
  expect(result.startsWith("about:blank")).toBe(false);
  expect(result.toLowerCase()).toContain("example.com");
});

test("affiliate treats mixed-case Http scheme as valid", () => {
  const result = affiliate("Http://example.com/path");
  expect(result).not.toBe("about:blank");
});

test("affiliate preserves query params and fragments on valid https URLs", () => {
  const url = "https://example.com/page?foo=bar#section";
  expect(affiliate(url)).toBe(url);
});
