import { LEAK_CLASSES } from "../constants";
import { FIELD_CONTEXTS } from "./field-types";
import type { FieldContext } from "./field-types";
import type { DecideInput, DecideResult, LeakClass, Settings, ToastPayload } from "./types";

export function defaultSettings(): Settings {
  const perTypeEnabled = {} as Record<LeakClass, boolean>;
  const dismissals = {} as Record<LeakClass, number>;
  for (const lc of LEAK_CLASSES) {
    perTypeEnabled[lc] = true;
    dismissals[lc] = 0;
  }
  const fieldDismissals = {} as Record<FieldContext, number>;
  for (const fc of FIELD_CONTEXTS) fieldDismissals[fc] = 0;
  return {
    perTypeEnabled,
    perSiteMutes: [],
    dismissals,
    toastsEnabled: true,
    fieldSuggestionsEnabled: true,
    fieldMutedSites: [],
    fieldDismissals,
  };
}

const AUTO_QUIET_AFTER = 3;
const MAX_ONPAGE_TOASTS = 3;

/** Pure: decide which toasts to show and the badge count for a page's hits. */
export function decide(input: DecideInput): DecideResult {
  const { hits, doneMoveIds, settings, currentHost, graph, atlasUrl } = input;
  const siteMuted = settings.perSiteMutes.includes(currentHost);

  // Dedupe to one decision per threat (badge counts distinct threats).
  const byThreat = new Map<string, (typeof hits)[number]>();
  for (const h of hits) if (!byThreat.has(h.threatId)) byThreat.set(h.threatId, h);

  const shown: ToastPayload[] = [];
  const all: ToastPayload[] = [];
  for (const hit of byThreat.values()) {
    const threat = graph.threats[hit.threatId];
    if (!threat) continue;
    const moves = threat.counters.map((id) => graph.moves[id]).filter((m): m is NonNullable<typeof m> => Boolean(m));
    const mode = moves.some((m) => doneMoveIds.has(m.id)) ? "apply" : "adopt";

    const payload: ToastPayload = {
      threatId: threat.id,
      threatLabel: threat.label,
      leakClass: hit.leakClass,
      mode,
      moves,
      deepLink: `${atlasUrl}/?threat=${threat.id}`,
    };

    // Always add to the full list for popup display regardless of suppression.
    all.push(payload);

    // `=== false` (not `!`): an unknown/absent alert type defaults to SHOWN, so newly-added
    // protections surface for users whose saved settings predate them. In practice settings are
    // always merged over defaultSettings(), so every known LeakClass is present.
    const suppressed =
      settings.toastsEnabled === false ||
      siteMuted ||
      settings.perTypeEnabled[hit.leakClass] === false ||
      (settings.dismissals[hit.leakClass] ?? 0) >= AUTO_QUIET_AFTER;
    if (suppressed) continue;

    shown.push(payload);
  }

  const toasts = shown.slice(0, MAX_ONPAGE_TOASTS);
  const overflow = shown.slice(MAX_ONPAGE_TOASTS);

  return { toasts, overflow, all, badge: all.length };
}
