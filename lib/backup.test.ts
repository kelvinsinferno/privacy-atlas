/**
 * lib/backup.test.ts
 * TDD tests for exportBackup / importBackup.
 * Run: npm test -- lib/backup.test.ts
 */

import { expect, test } from "vitest";
import { exportBackup, importBackup } from "./backup";

// ── Provided tests ──────────────────────────────────────────────────────────

test("export then import round-trips journey/profile/devices", () => {
  const blob = exportBackup({ journeyProgress: { a: 1 }, profile: { worry: "broad" }, devices: { phone: "ios" } });
  const restored = importBackup(blob);
  expect(restored.journeyProgress.a).toBe(1);
  expect(restored.profile.worry).toBe("broad");
});

test("import rejects malformed text", () => {
  expect(() => importBackup("not json")).toThrow();
});

// ── Additional meaningful tests ─────────────────────────────────────────────

test("export produces a string", () => {
  const blob = exportBackup({ journeyProgress: {}, profile: {}, devices: {} });
  expect(typeof blob).toBe("string");
});

test("round-trip preserves devices too", () => {
  const blob = exportBackup({
    journeyProgress: { step1: true },
    profile: { worry: "narrow", friction: "low", level: 2 },
    devices: { phone: "android", desktop: "linux", browser: "firefox" },
  });
  const restored = importBackup(blob);
  expect(restored.devices.phone).toBe("android");
  expect(restored.devices.desktop).toBe("linux");
  expect(restored.devices.browser).toBe("firefox");
});

test("import rejects valid JSON that is an array", () => {
  // An array is valid JSON but not the expected object shape.
  expect(() => importBackup(JSON.stringify([1, 2, 3]))).toThrow();
});

test("import rejects valid JSON that is a plain non-backup object (no known keys)", () => {
  // An object with none of the three known keys — clearly wrong shape.
  expect(() => importBackup(JSON.stringify({ foo: "bar", baz: 42 }))).toThrow();
});

test("import accepts partial backup (only profile present) and defaults missing keys to empty", () => {
  // DESIGN CHOICE: mirrors prototype leniency — obj.data || obj, only present keys
  // restored. Missing keys default to {} so callers get a safe object.
  // The prototype does: if (data[k] !== undefined) { restore k } — silently skips
  // absent keys. We mirror that: return the partial with missing keys defaulted to {}.
  const partial = JSON.stringify({ profile: { worry: "narrow" } });
  const restored = importBackup(partial);
  expect(restored.profile.worry).toBe("narrow");
  expect(restored.journeyProgress).toEqual({});
  expect(restored.devices).toEqual({});
});

test("import accepts versioned-wrapper format (prototype export shape)", () => {
  // The prototype exports { privacyAtlasBackup: 1, exportedAt: "...", data: { ... } }.
  // importBackup must unwrap data like the prototype's `obj.data || obj`.
  const wrapper = JSON.stringify({
    privacyAtlasBackup: 1,
    exportedAt: new Date().toISOString(),
    data: { journeyProgress: { x: 99 }, profile: { worry: "full" }, devices: {} },
  });
  const restored = importBackup(wrapper);
  expect(restored.journeyProgress.x).toBe(99);
  expect(restored.profile.worry).toBe("full");
});

test("export output is the versioned wrapper format", () => {
  // Export should produce { privacyAtlasBackup, exportedAt, data } to match prototype.
  const blob = exportBackup({ journeyProgress: { z: 7 }, profile: {}, devices: {} });
  const parsed = JSON.parse(blob);
  expect(parsed.privacyAtlasBackup).toBe(1);
  expect(typeof parsed.exportedAt).toBe("string");
  expect(parsed.data.journeyProgress.z).toBe(7);
});

test("import rejects null (valid JSON but not an object)", () => {
  expect(() => importBackup("null")).toThrow();
});

test("import rejects a number (valid JSON, wrong shape)", () => {
  expect(() => importBackup("42")).toThrow();
});
