import { expect, test } from "vitest";
import { S } from "./styles";

test("style object exposes core regions", () => {
  for (const k of ["app", "header", "tabs", "body", "left", "center", "right"]) {
    expect(S[k]).toBeTruthy();
  }
});

test("S font sizes stay on the deliberate ramp", () => {
  const RAMP = new Set([10, 10.5, 11, 12.5, 14, 17, 22, 24, 26, 30, 44]);
  for (const [key, val] of Object.entries(S)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = (val as any).fontSize;
    if (typeof fs === "number") {
      expect(RAMP.has(fs), `S.${key}.fontSize=${fs} is off the type ramp`).toBe(true);
    }
  }
});
