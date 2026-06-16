import type { Graph } from "./types";

/** Enforces HANDOFF §1.3: verifiability + honesty are REQUIRED fields, plus edge integrity. */
export function validateGraph(g: Graph): string[] {
  const errs: string[] = [];
  const ids = new Set<string>([...g.nodes.map((n) => n.id), ...g.threats.map((t) => t.id)]);

  for (const n of g.nodes) {
    if (!n.sources?.length) errs.push(`node ${n.id}: missing sources (verifiability is required)`);
    if (!n.caveat && !n.failureMode) errs.push(`node ${n.id}: missing caveat/failureMode (honesty is required)`);
    if (n.label && n.label.length > 48) errs.push(`node ${n.id}: move label exceeds 48 chars`);
  }
  for (const t of g.threats) {
    if (t.residual == null || t.residual === "") errs.push(`threat ${t.id}: missing residual (honesty is required)`);
    if (!t.sources?.length) errs.push(`threat ${t.id}: missing sources`);
  }
  for (const e of g.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) errs.push(`unresolved edge ${e.from} -> ${e.to}`);
  }
  return errs;
}
