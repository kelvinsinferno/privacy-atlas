import type { LeakMap, RawSignal, ThreatHit, TrackerRadar, TrackerRadarEntry } from "./types";

/** Find a Tracker Radar entry by exact host or registrable-domain suffix (label-walk). */
function lookupHost(host: string, radar: TrackerRadar): TrackerRadarEntry | undefined {
  const labels = host.split(".");
  // Walk from the full host down to the 2-label registrable domain (never the bare TLD).
  for (let i = 0; i < labels.length - 1; i++) {
    const entry = radar[labels.slice(i).join(".")];
    if (entry) return entry;
  }
  return undefined;
}

/** Pure: turn raw page signals into deduped Atlas threat hits. */
export function classify(signals: RawSignal[], leakMap: LeakMap, radar: TrackerRadar): ThreatHit[] {
  const seen = new Set<string>();
  const hits: ThreatHit[] = [];
  const push = (threatId: string, leakClass: ThreatHit["leakClass"], entity?: string) => {
    const key = threatId + "|" + leakClass;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ threatId, leakClass, entity });
  };

  for (const sig of signals) {
    if (sig.kind === "resource") {
      const entry = lookupHost(sig.value, radar);
      if (!entry) continue;
      for (const lc of entry.categories) {
        for (const threatId of leakMap.categories[lc] ?? []) push(threatId, lc, entry.entity);
      }
    } else {
      // Behavioral signals are fingerprinting-class by convention (canvas/font enumeration, etc.).
      for (const threatId of leakMap.behavioral[sig.value] ?? []) push(threatId, "fingerprinting");
    }
  }
  return hits;
}
