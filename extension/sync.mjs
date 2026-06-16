#!/usr/bin/env node
// Regenerate the extension's bundled data from the main repo.
// Run from extension/:  node sync.mjs
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = join(__dirname, "..");

// 1) leak-map: copy main-repo source of truth verbatim.
copyFileSync(join(repo, "data", "leak-map.json"), join(__dirname, "data", "leak-map.json"));
copyFileSync(join(repo, "data", "field-map.json"), join(__dirname, "data", "field-map.json"));

// 2) graph-subset: threats (id,label,residual,counters) + counter-moves (id,label,summary,domain).
const graph = JSON.parse(readFileSync(join(repo, "data", "graph.json"), "utf8"));
const moveById = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
const threats = {};
const moves = {};
for (const t of graph.threats) {
  threats[t.id] = { id: t.id, label: t.label, residual: t.residual, counters: t.counters ?? [] };
  for (const mid of t.counters ?? []) {
    const m = moveById[mid];
    if (m) moves[m.id] = { id: m.id, label: m.label, summary: m.summary, domain: m.domain };
  }
}
// Ensure every field-map move is renderable in the popover even if it's not a threat counter.
const fieldMap = JSON.parse(readFileSync(join(repo, "data", "field-map.json"), "utf8"));
for (const ids of Object.values(fieldMap)) {
  for (const mid of ids) {
    const m = moveById[mid];
    if (m && !moves[mid]) moves[mid] = { id: m.id, label: m.label, summary: m.summary, domain: m.domain };
  }
}
writeFileSync(join(__dirname, "data", "graph-subset.json"), JSON.stringify({ threats, moves }, null, 2));

console.log(`synced: leak-map.json + field-map.json + graph-subset.json (${Object.keys(threats).length} threats, ${Object.keys(moves).length} moves)`);
