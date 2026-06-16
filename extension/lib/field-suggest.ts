import type { FieldContext, FieldMap, FieldSuggestion } from "./field-types";
import type { GraphSubset, Move, Settings } from "./types";

const AUTO_QUIET_AFTER = 3;

export interface FieldSuggestInput {
  context: FieldContext;
  doneMoveIds: Set<string>;
  settings: Settings;
  currentHost: string;
  graph: GraphSubset;
  fieldMap: FieldMap;
  atlasUrl: string;
}

/** Pure: decide the field suggestion for a focused field-context, or null if it should not show. */
export function fieldSuggestion(input: FieldSuggestInput): FieldSuggestion | null {
  const { context, doneMoveIds, settings, currentHost, graph, fieldMap, atlasUrl } = input;

  if (settings.fieldSuggestionsEnabled === false) return null;
  if (settings.perSiteMutes.includes(currentHost)) return null;
  if (settings.fieldMutedSites.includes(currentHost)) return null;
  if ((settings.fieldDismissals[context] ?? 0) >= AUTO_QUIET_AFTER) return null;

  const moves = (fieldMap[context] ?? [])
    .map((id) => graph.moves[id])
    .filter((m): m is Move => Boolean(m));
  if (moves.length === 0) return null;

  const mode = moves.some((m) => doneMoveIds.has(m.id)) ? "apply" : "adopt";
  const first = moves[0]!;
  return { context, mode, moves, deepLink: `${atlasUrl}/?node=${first.id}` };
}
