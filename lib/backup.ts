/**
 * lib/backup.ts — Plain-text backup / restore for the user's local state.
 *
 * DESIGN NOTES
 * ─────────────
 * Export format: versioned wrapper, mirroring the prototype (PrivacyAtlas.jsx L796):
 *   { privacyAtlasBackup: 1, exportedAt: "<ISO>", data: { journeyProgress, profile, devices } }
 *
 * Import leniency: mirrors the prototype's `obj.data || obj` unwrap, then silently
 * skips missing keys (only restores keys that are present). Missing keys are defaulted
 * to `{}` in the return value so callers always get a safe object.
 *
 * Validation: throws on
 *   - JSON parse failures (malformed text)
 *   - Non-object values (arrays, null, numbers, strings)
 *   - Objects with none of the three known keys AND no `data` wrapper
 *     (clearly wrong shape — not a Privacy Atlas backup)
 *
 * These are PURE functions. No storage / DOM access — the Phase 8 modal wires storage.
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

/** Recorded answers from the user's profile quiz (~worry / friction / level). */
export type Profile = Record<string, unknown>;

/** Device answers ({phone, desktop, browser, ...}). */
export type Devices = Record<string, unknown>;

/** Map of node-id → completion state (boolean, timestamp, etc.). */
export type JourneyProgress = Record<string, unknown>;

/** The three keys that make up a user's local state. */
export interface BackupPayload {
  journeyProgress: JourneyProgress;
  profile: Profile;
  devices: Devices;
}

/** The on-disk / clipboard format — versioned wrapper. */
interface BackupEnvelope {
  privacyAtlasBackup: 1;
  exportedAt: string;
  data: BackupPayload;
}

/* ── Known top-level keys ──────────────────────────────────────────────── */

const KNOWN_KEYS: ReadonlyArray<keyof BackupPayload> = [
  "journeyProgress",
  "profile",
  "devices",
];

/* ── exportBackup ──────────────────────────────────────────────────────── */

/**
 * Serialize the user's local state to a plain-text JSON string.
 *
 * Produces the versioned envelope so the Phase 8 modal's textarea shows
 * the same format the prototype used, and so `importBackup` can unwrap it.
 */
export function exportBackup(state: BackupPayload): string {
  const envelope: BackupEnvelope = {
    privacyAtlasBackup: 1,
    exportedAt: new Date().toISOString(),
    data: {
      journeyProgress: state.journeyProgress,
      profile: state.profile,
      devices: state.devices,
    },
  };
  return JSON.stringify(envelope, null, 1);
}

/* ── importBackup ──────────────────────────────────────────────────────── */

/**
 * Parse and validate a backup string, returning the restored state.
 *
 * Mirrors the prototype's import logic:
 *   1. JSON.parse (throws → "malformed text")
 *   2. Unwrap envelope: `obj.data || obj`
 *   3. For each known key, include it only if present in the data object
 *   4. Default missing keys to {} so callers always get a safe object
 *
 * @throws {Error} on JSON parse failure or clearly wrong shape
 */
export function importBackup(text: string): BackupPayload {
  // Step 1 — parse (throws SyntaxError on bad JSON)
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "importBackup: could not parse backup text — paste the exact backup text you exported."
    );
  }

  // Step 2 — must be a plain object (not array, null, number, string)
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "importBackup: backup must be a JSON object, not an array or primitive."
    );
  }

  // Step 3 — unwrap versioned envelope (prototype: `obj.data || obj`)
  const obj = parsed as Record<string, unknown>;
  const data: Record<string, unknown> =
    obj.data !== undefined && typeof obj.data === "object" && obj.data !== null && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;

  // Step 4 — at least one known key must be present (guards against
  //           unrelated JSON objects that happen to be records)
  const hasKnownKey = KNOWN_KEYS.some((k) => data[k] !== undefined);
  if (!hasKnownKey) {
    throw new Error(
      "importBackup: backup does not contain any recognizable Privacy Atlas data (journeyProgress, profile, or devices)."
    );
  }

  // Step 5 — build result, defaulting missing keys to {}
  return {
    journeyProgress:
      data.journeyProgress !== undefined &&
      typeof data.journeyProgress === "object" &&
      data.journeyProgress !== null &&
      !Array.isArray(data.journeyProgress)
        ? (data.journeyProgress as JourneyProgress)
        : {},
    profile:
      data.profile !== undefined &&
      typeof data.profile === "object" &&
      data.profile !== null &&
      !Array.isArray(data.profile)
        ? (data.profile as Profile)
        : {},
    devices:
      data.devices !== undefined &&
      typeof data.devices === "object" &&
      data.devices !== null &&
      !Array.isArray(data.devices)
        ? (data.devices as Devices)
        : {},
  };
}
