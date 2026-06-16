import { expect, test } from "vitest";
import { DOMAIN, DOMAIN_LETTER } from "./ui-maps";

test("DOMAIN_LETTER has a unique letter per domain with no collisions", () => {
  const keys = Object.keys(DOMAIN);
  const letters = keys.map((k) => DOMAIN_LETTER[k]);
  // Every domain should have a letter
  letters.forEach((l) => expect(l).toBeTruthy());
  // All letters should be unique
  const unique = new Set(letters);
  expect(unique.size).toBe(keys.length);
});
