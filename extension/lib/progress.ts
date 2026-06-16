/** Parse the app's journeyProgress JSON into the list of completed move ids. */
export function doneIdsFromJourney(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const obj: unknown = JSON.parse(raw);
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return [];
    const rec = obj as Record<string, unknown>;
    return Object.keys(rec).filter((k) => Boolean(rec[k]));
  } catch {
    return [];
  }
}
