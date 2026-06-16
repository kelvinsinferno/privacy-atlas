/**
 * lib/search.ts — Unified search index for Privacy Atlas.
 *
 * Pure module: no React, no DOM. Import from components to wire search.
 */

import { DOMAIN, DOMAIN_LETTER, THREAT_C } from "@/data/ui-maps";
import { RESOURCES } from "@/data/resources";
import { JOURNEYS } from "@/data/journeys";
import { PERSONAS } from "@/data/personas";
import type { Model } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Public types                                                        */
/* ------------------------------------------------------------------ */

export type SearchKind = "move" | "threat" | "resource" | "mission" | "look" | "section";

export interface SearchEntry {
  /** Unique key across the whole index. */
  key: string;
  /** Primary display text shown in results. */
  label: string;
  /** Secondary muted line (kind / location hint). */
  sub: string;
  kind: SearchKind;
  /** Dot fill color (domain color or threat red). */
  swatch?: string;
  /** When true, render swatch as a rotated square (diamond) instead of circle. */
  diamond?: boolean;
  /** Domain letter for move entries — a non-color a11y signal; absent for threats/other kinds. */
  letter?: string;
  /** Present for move / threat / resource entries — opens this node on the map. */
  nodeId?: string;
  /** Present for mission / look / section entries — navigates to this tab. */
  tab?: string;
  /**
   * Lowercased concatenation of all searchable text for this entry.
   * Used only for filtering — never displayed.
   */
  haystack: string;
}

/* ------------------------------------------------------------------ */
/*  Fixed section entries                                               */
/* ------------------------------------------------------------------ */

const SECTIONS: Array<{ label: string; tab: string }> = [
  { label: "The Web (map)", tab: "map" },
  { label: "Journeys",      tab: "journeys" },
  { label: "Counter Threats", tab: "threats" },
  { label: "Outfitted",     tab: "outfitted" },
  { label: "Contribute",    tab: "contribute" },
  { label: "My Path",       tab: "path" },
];

/* ------------------------------------------------------------------ */
/*  buildSearchIndex                                                    */
/* ------------------------------------------------------------------ */

/**
 * Assemble a flat SearchEntry[] from all content sources.
 * Call once (or memoize) per Model instance — the index is stable
 * for the lifetime of a given model.
 */
export function buildSearchIndex(model: Model): SearchEntry[] {
  const entries: SearchEntry[] = [];

  /* ---- Moves (graph nodes) ---------------------------------------- */
  model.all
    .filter((n) => n.kind === "node")
    .forEach((n) => {
      const domainKey = (n as { domain?: string }).domain ?? "";
      const domainLabel = DOMAIN[domainKey]?.label ?? domainKey;
      const swatch = DOMAIN[domainKey]?.c;
      const summary = (n as { summary?: string }).summary ?? "";
      entries.push({
        key: `move:${n.id}`,
        label: n.label,
        sub: `move · ${domainLabel}`,
        kind: "move",
        swatch,
        letter: DOMAIN_LETTER[domainKey],
        diamond: false,
        nodeId: n.id,
        haystack: [n.label, `move`, domainLabel, summary, n.id].join(" ").toLowerCase(),
      });
    });

  /* ---- Threats ------------------------------------------------------- */
  model.all
    .filter((n) => n.kind === "threat")
    .forEach((n) => {
      const residual = (n as { residual?: string }).residual ?? "";
      entries.push({
        key: `threat:${n.id}`,
        label: n.label,
        sub: "threat",
        kind: "threat",
        swatch: THREAT_C,
        diamond: true,
        nodeId: n.id,
        haystack: [n.label, "threat", residual, n.id].join(" ").toLowerCase(),
      });
    });

  /* ---- Resources / tools -------------------------------------------- */
  // Dedupe on (name, nodeId) — same tool listed twice for same node is a data error.
  const seen = new Set<string>();
  Object.entries(RESOURCES).forEach(([nodeId, items]) => {
    const parentNode = model.byId.get(nodeId);
    const parentLabel = parentNode?.label ?? nodeId;
    const domainKey = parentNode ? ((parentNode as { domain?: string }).domain ?? "") : "";
    const swatch = DOMAIN[domainKey]?.c;

    items.forEach((r) => {
      const dupeKey = `${r.name}::${nodeId}`;
      if (seen.has(dupeKey)) return;
      seen.add(dupeKey);
      entries.push({
        key: `resource:${nodeId}:${r.name}`,
        label: r.name,
        sub: `tool · in ${parentLabel} · ${nodeId}`,
        kind: "resource",
        swatch,
        letter: DOMAIN_LETTER[domainKey],
        diamond: false,
        nodeId,
        haystack: [r.name, "tool", parentLabel, nodeId, r.forStep ?? ""].join(" ").toLowerCase(),
      });
    });
  });

  /* ---- Missions (Journeys) ------------------------------------------ */
  JOURNEYS.forEach((j) => {
    entries.push({
      key: `mission:${j.id}`,
      label: j.label,
      sub: "mission",
      kind: "mission",
      tab: "journeys",
      haystack: [j.label, "mission", j.id].join(" ").toLowerCase(),
    });
  });

  /* ---- Looks (Personas) -------------------------------------------- */
  PERSONAS.forEach((p) => {
    const subLine = p.tag ? `${p.tag} · look` : "look";
    entries.push({
      key: `look:${p.id}`,
      label: p.name,
      sub: subLine,
      kind: "look",
      tab: "outfitted",
      haystack: [p.name, p.tag ?? "", "look", p.id].join(" ").toLowerCase(),
    });
  });

  /* ---- Sections (tabs) --------------------------------------------- */
  SECTIONS.forEach((s) => {
    entries.push({
      key: `section:${s.tab}`,
      label: s.label,
      sub: "go to section",
      kind: "section",
      tab: s.tab,
      haystack: [s.label, "section", s.tab, "go to"].join(" ").toLowerCase(),
    });
  });

  return entries;
}

/* ------------------------------------------------------------------ */
/*  searchEntries                                                       */
/* ------------------------------------------------------------------ */

/** Kind priority for stable tie-breaking. Lower = ranked higher. */
const KIND_RANK: Record<SearchKind, number> = {
  move: 0,
  threat: 1,
  resource: 2,
  mission: 3,
  look: 4,
  section: 5,
};

/**
 * Filter and rank SearchEntry[] against a query string.
 *
 * Ranking tiers (lower tier wins):
 *   0. entry.label exactly equals query          (tier-0 — highest)
 *   1. entry.label startsWith query              (but not exact)
 *   2. entry.label includes query                (but not startsWith)
 *   3. entry.haystack includes query             (label didn't match at all)
 *
 * Within the same tier, entries are sorted by kind priority:
 *   move < threat < resource < mission < look < section
 *
 * @param index  The SearchEntry[] from buildSearchIndex.
 * @param query  Raw user input (will be lowercased internally).
 * @param limit  Max results to return (default 12).
 */
export function searchEntries(
  index: SearchEntry[],
  query: string,
  limit = 12,
): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tier0: SearchEntry[] = []; // exact label match
  const tier1: SearchEntry[] = []; // label startsWith query
  const tier2: SearchEntry[] = []; // label includes query (not startsWith)
  const tier3: SearchEntry[] = []; // haystack includes query (label didn't match)

  for (const e of index) {
    const labelLow = e.label.toLowerCase();
    if (labelLow === q) {
      tier0.push(e);
    } else if (labelLow.startsWith(q)) {
      tier1.push(e);
    } else if (labelLow.includes(q)) {
      tier2.push(e);
    } else if (e.haystack.includes(q)) {
      tier3.push(e);
    }
  }

  const byKind = (a: SearchEntry, b: SearchEntry) =>
    KIND_RANK[a.kind] - KIND_RANK[b.kind];

  tier0.sort(byKind);
  tier1.sort(byKind);
  tier2.sort(byKind);
  tier3.sort(byKind);

  return [...tier0, ...tier1, ...tier2, ...tier3].slice(0, limit);
}
