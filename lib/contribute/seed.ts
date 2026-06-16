import type { NodeKind, ProposedNodePayload, HowtoPayload, ResourcePayload, SourcePayload } from "./types";

/** A loose view of a graph.json node/threat (only the fields we map). */
interface GraphNodeish {
  id: string;
  label: string;
  domain?: string;
  summary?: string;
  failureMode?: string;       // moves
  residual?: string;          // threats
  sources?: Array<{ title?: string; url?: string; kind?: string }>;
}

/** Map a built-in how-to (data/howtos.ts) to a contribution payload. */
export function howtoToSeedPayload(nodeId: string, howto: { platform: string; steps: string[] }): HowtoPayload {
  return { kind: "howto", targetId: nodeId, platform: howto.platform, steps: howto.steps };
}

export function resourceToSeedPayload(nodeId: string, r: { name: string; url: string; type?: string; forStep?: string }): ResourcePayload {
  const resourceType = r.type === "product" || r.type === "service" ? "product" : "link";
  const p: ResourcePayload = { kind: "resource", targetId: nodeId, name: r.name, url: r.url, resourceType };
  if (r.forStep) p.forStep = r.forStep;
  return p;
}

export function sourceToSeedPayload(nodeId: string, s: { title: string; url: string; kind?: string }): SourcePayload {
  const p: SourcePayload = { kind: "source", targetId: nodeId, title: s.title, url: s.url };
  if (s.kind) p.sourceKind = s.kind;
  return p;
}

/** Map a built-in graph node/threat to a contribution payload. NO `rel`: the
 *  edges already exist in graph.json, and the bake skips ids already present, so
 *  seeding must not regenerate edges. */
export function nodeToSeedPayload(node: GraphNodeish, kind: NodeKind): ProposedNodePayload {
  const honesty = kind === "threat" ? node.residual : node.failureMode;
  const s = node.sources?.[0];
  const payload: ProposedNodePayload = { nodeKind: kind, label: node.label };
  if (node.domain) payload.domain = node.domain;
  if (node.summary) payload.summary = node.summary;
  if (honesty) payload.honesty = honesty;
  if (s?.url) payload.src = { url: s.url, ...(s.title ? { title: s.title } : {}) };
  return payload;
}
