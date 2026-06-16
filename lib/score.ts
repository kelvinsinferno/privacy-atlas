/**
 * lib/score.ts — Scoring + recheck primitives for Privacy Atlas.
 *
 * Ported VERBATIM from reference/PrivacyAtlas.jsx (L365–L409).
 * Pure functions — no DOM, no React, no storage.
 */

import type { Model, ModelNode, Node } from "@/lib/types";
import { PRIVACY_CEILING, RECHECK_DAYS } from "@/data/ui-maps";

// Re-export so consumers can import from "@/lib/score" without reaching into data/ui-maps.
export { PRIVACY_CEILING } from "@/data/ui-maps";

/* ------------------------------------------------------------------ */
/*  nodeWeight (L365)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Weight of a node toward the privacy score.
 * weight 1-5 plus a tier bonus; traps/awareness count less toward "progress".
 */
export function nodeWeight(n: ModelNode): number {
  // Both Node and Threat have tier; only Node has weight — cast to Node for weight access.
  const asNode = n as Node;
  const base = (asNode.weight || 1) + (n.tier || 1) * 0.6;
  return base;
}

/* ------------------------------------------------------------------ */
/*  privacyLabel (L400)                                                */
/* ------------------------------------------------------------------ */

export interface PrivacyLabel {
  /** Display text. */
  t: string;
  /** Hex colour. */
  c: string;
}

/**
 * Returns a human-readable label + colour for a capped privacy score.
 * pct is already on the capped 0..PRIVACY_CEILING scale.
 */
export function privacyLabel(pct: number): PrivacyLabel {
  // normalize back to 0..1 for banding
  const p = pct / PRIVACY_CEILING;
  if (p <= 0.001) return { t: "Fully exposed",            c: "#ff5c5c" };
  if (p < 0.18)   return { t: "Barely covered",           c: "#ff8c6b" };
  if (p < 0.4)    return { t: "Getting started",          c: "#f0a868" };
  if (p < 0.62)   return { t: "Meaningfully private",     c: "#f0c468" };
  if (p < 0.82)   return { t: "Well defended",            c: "#bfe08c" };
  return           { t: "Hardened (never invisible)",      c: "#8ce29a" };
}

/* ------------------------------------------------------------------ */
/*  computePrivacyScore (L370)                                         */
/* ------------------------------------------------------------------ */

export interface PrivacyScore {
  /**
   * The capped privacy fraction on a 0..PRIVACY_CEILING (0..0.92) scale —
   * multiply by 100 for display; pass directly to privacyLabel.
   */
  pct: number;
  /** Human-readable label. */
  lab: string;
  /** Raw (uncapped) fraction 0..1. */
  rawPct: number;
  /** Number of completed non-trap nodes. */
  completed: number;
  /** Total non-trap nodes. */
  total: number;
}

/**
 * Weighted privacy score from completed moves.
 * Weighted by node weight + tier (deep/hard moves count more), and CAPPED
 * so it never reads 100% — the residual-risk ethos says "as private as
 * realistically possible" is a ceiling, never "invisible".
 *
 * @param model   — output of buildModel()
 * @param done    — Record<nodeId, timestamp (ms) | true (legacy) | 0 | undefined>
 */
export function computePrivacyScore(
  model: Model,
  done: Record<string, number | boolean>
): PrivacyScore {
  const nodes = model.all.filter(
    (x) => x.kind === "node" && (x as Node).actionability !== "trap"
  );
  let totalW = 0;
  let gotW = 0;
  nodes.forEach((n) => {
    const w = nodeWeight(n);
    totalW += w;
    if (done[n.id]) gotW += w;
  });
  const raw = totalW ? gotW / totalW : 0;
  // pct matches the prototype fraction contract: consumers multiply by 100 or normalize via privacyLabel.
  const pct = Math.min(raw, 1) * PRIVACY_CEILING;
  return {
    pct,
    lab: privacyLabel(pct).t,
    rawPct: raw,
    completed: nodes.filter((n) => done[n.id]).length,
    total: nodes.length,
  };
}

/* ------------------------------------------------------------------ */
/*  dueForRecheck (L390)                                               */
/* ------------------------------------------------------------------ */

/**
 * Whether a node's completion has aged past its recheck threshold.
 *
 * @param n       — the node (must have n.cost.maintenance)
 * @param doneVal — the value from done[n.id]: a ms timestamp, true (legacy), or falsy
 *
 * Legacy boolean `true` (undated) is honored but cannot age → never due.
 * Falsy / not done → not due.
 */
export function dueForRecheck(
  n: { cost?: { maintenance?: string } },
  doneVal: number | boolean | undefined | null
): boolean {
  if (!doneVal || doneVal === true) return false;
  const days = RECHECK_DAYS[(n.cost && n.cost.maintenance) || ""];
  if (!days) return false;
  return Date.now() - (doneVal as number) > days * 86400000;
}

/* ------------------------------------------------------------------ */
/*  countDue (L396)                                                    */
/* ------------------------------------------------------------------ */

/**
 * Count how many nodes in the model are due for recheck.
 */
export function countDue(model: Model, done: Record<string, number | boolean>): number {
  return model.all.filter(
    (x) => x.kind === "node" && dueForRecheck(x as Node, done[x.id])
  ).length;
}
