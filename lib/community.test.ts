import { expect, test } from "vitest";
import { _h, _bars, entryStatus, newEntryId } from "./community";

// A deterministic entry id for stable threshold tests.
// _bars("test-entry-id") must always return the same promote/reject.
const STABLE_ID = "test-entry-id";

test("_h returns a non-negative integer for any string", () => {
  expect(_h("")).toBeGreaterThanOrEqual(0);
  expect(_h("hello")).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(_h("hello"))).toBe(true);
});

test("_bars: promote is in range 9–16, reject is in range 5–8", () => {
  // Test several ids to cover the full output range spec
  for (const id of [STABLE_ID, "abc", "z", "xaolive", "1234567890abcdef"]) {
    const b = _bars({ id });
    expect(b.promote).toBeGreaterThanOrEqual(9);
    expect(b.promote).toBeLessThanOrEqual(16);
    expect(b.reject).toBeGreaterThanOrEqual(5);
    expect(b.reject).toBeLessThanOrEqual(8);
  }
});

test("_bars: falls back to ts when id is absent", () => {
  const b = _bars({ ts: 1234567890 });
  expect(b.promote).toBeGreaterThanOrEqual(9);
  expect(b.promote).toBeLessThanOrEqual(16);
});

test("_bars: deterministic — same id always gives same thresholds", () => {
  const a = _bars({ id: STABLE_ID });
  const b = _bars({ id: STABLE_ID });
  expect(a.promote).toBe(b.promote);
  expect(a.reject).toBe(b.reject);
});

test("entryStatus: confirms above promote with flags*3 <= confirms → 'verified'", () => {
  const { promote } = _bars({ id: STABLE_ID });
  // confirms = promote, flags = 0 → satisfies c >= promote AND c >= 0*3
  expect(entryStatus({ id: STABLE_ID, confirms: promote, flags: 0 })).toBe("verified");
  // confirms = promote + 5, flags = 1 → c >= promote AND c (e.g. 14) >= 1*3=3
  expect(entryStatus({ id: STABLE_ID, confirms: promote + 5, flags: 1 })).toBe("verified");
});

test("entryStatus: flags >= reject AND flags >= confirms → 'rejected'", () => {
  const { reject } = _bars({ id: STABLE_ID });
  // flags = reject, confirms = 0 → rejected
  expect(entryStatus({ id: STABLE_ID, confirms: 0, flags: reject })).toBe("rejected");
  // flags = reject + 1, confirms = reject + 1 (tied) → rejected (f>=c is true)
  expect(entryStatus({ id: STABLE_ID, confirms: reject, flags: reject })).toBe("rejected");
});

test("entryStatus: middling counts → 'pending'", () => {
  // confirms = 2 (below any promote), flags = 0
  expect(entryStatus({ id: STABLE_ID, confirms: 2, flags: 0 })).toBe("pending");
  // confirms = 1, flags = 1 (f < reject, c < promote)
  expect(entryStatus({ id: STABLE_ID, confirms: 1, flags: 1 })).toBe("pending");
  // zero counts → pending
  expect(entryStatus({ id: STABLE_ID, confirms: 0, flags: 0 })).toBe("pending");
});

test("entryStatus: 3:1 rule — confirms just below 3×flags is NOT verified even if confirms >= promote", () => {
  const { promote } = _bars({ id: STABLE_ID });
  // flags = 5 → need confirms >= 15; set confirms = promote (might be >=9) but flags*3 = 15
  // We want a case where c >= promote but c < f*3
  // Use flags such that flags*3 > promote: flags = ceil(promote/3) + 1
  const flags = Math.ceil(promote / 3) + 1; // ensures flags*3 > promote
  // confirms = promote (satisfies c >= promote), but confirm < flags*3
  // This only works if promote < flags*3; let's ensure by using confirms = promote
  if (promote < flags * 3) {
    expect(entryStatus({ id: STABLE_ID, confirms: promote, flags })).not.toBe("verified");
  }
  // Explicit: confirms = 12, flags = 5 → confirms (12) >= f*3 (15)? NO → not verified
  // But also must check: 12 >= promote? Depends on id. Use a neutral check with known values.
  // Force a concrete case: use an id where promote=9 (minimum), then flags=4 → f*3=12, confirms=11
  // We can find such an id by scanning, but instead just test the boundary formula directly:
  // c >= t.promote AND c >= f*3; if c = f*3 - 1, the second condition fails → not verified
  const f2 = 4; // flags*3 = 12
  const c2 = 11; // just below 12
  // c2 might still be above promote for some ids, but not satisfy f*3 rule:
  const result = entryStatus({ id: STABLE_ID, confirms: c2, flags: f2 });
  // confirms=11 < flags*3=12, so cannot be verified regardless of promote
  expect(result).not.toBe("verified");
});

test("newEntryId: returns a non-empty string and two calls differ", () => {
  const a = newEntryId();
  const b = newEntryId();
  expect(typeof a).toBe("string");
  expect(a.length).toBeGreaterThan(0);
  expect(a).not.toBe(b); // collision possible in theory but astronomically unlikely
});
