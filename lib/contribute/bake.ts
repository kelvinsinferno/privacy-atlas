import type { ContributionWithStatus } from "./types";

type Graph = { nodes: Array<Record<string, unknown>>; threats: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>>; [k: string]: unknown };

/** Merge VERIFIED contributions into a graph object (mirrors buildModel's community merge,
 *  but for the static data file). Pure + idempotent: skips non-verified + ids already present. */
export function mergeVerifiedIntoGraph(graph: Graph, contributions: ContributionWithStatus[]): Graph {
  const nodes = [...graph.nodes];
  const threats = [...graph.threats];
  const edges = [...graph.edges];
  const have = new Set([...nodes, ...threats].map((n) => n.id as string));

  for (const c of contributions) {
    if (c.status !== "verified" || have.has(c.id)) continue;
    const p = c.payload;
    if (!("nodeKind" in p)) continue; // how-tos are not graph nodes; the bake only merges node payloads
    const sources = p.src?.url ? [{ title: p.src.title || p.src.url, url: p.src.url, kind: "community" }] : [];
    if (p.nodeKind === "threat") {
      threats.push({ id: c.id, label: p.label, domain: p.domain || "digital", trajectory: "emerging", tier: 3, counters: p.rel || [], residual: p.honesty || "", sources, community: true });
    } else {
      nodes.push({ id: c.id, label: p.label, domain: p.domain || "digital", tier: 3, weight: 3, summary: p.summary || "", caveat: p.honesty || "", cost: { money: "low", friction: "med", maintenance: "periodic" }, sources, actors: [], regionScope: "global", community: true });
    }
    have.add(c.id);
    for (const rid of p.rel || []) {
      edges.push(p.nodeKind === "threat" ? { from: rid, to: c.id, type: "counters" } : { from: c.id, to: rid, type: "counters" });
    }
  }
  return { ...graph, nodes, threats, edges };
}

/** Remove nodes/threats with the given ids and any edge touching them. Pure.
 *  Used by the bake to clear content the maintainer/AI rejected (removed). */
export function pruneFromGraph(graph: Graph, ids: string[]): Graph {
  const gone = new Set(ids);
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => !gone.has(n["id"] as string)),
    threats: graph.threats.filter((n) => !gone.has(n["id"] as string)),
    edges: graph.edges.filter((e) => !gone.has(e["from"] as string) && !gone.has(e["to"] as string)),
  };
}
