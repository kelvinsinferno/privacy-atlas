#!/usr/bin/env node
// Idempotent ingest of built-in node/threat citations (graph.json sources) as
// verified source contributions. Requires DATABASE_URL: npx tsx scripts/seed-sources.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { seedSources } from "../lib/db/queries.ts";
import { sourceToSeedPayload } from "../lib/contribute/seed.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(readFileSync(join(__dirname, "..", "data", "graph.json"), "utf8"));
const rows = [];
for (const n of [...graph.nodes, ...graph.threats]) {
  (n.sources || []).forEach((s, i) => { if (s && s.url) rows.push({ id: `src:${n.id}:${i}`, payload: sourceToSeedPayload(n.id, s) }); });
}
const added = await seedSources(rows);
console.log(`seeded ${added} new source(s) (of ${rows.length}; existing ids skipped)`);
