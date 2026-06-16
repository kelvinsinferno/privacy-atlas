#!/usr/bin/env node
// One-time (idempotent) ingest of built-in graph.json content into the
// contributions table as already-verified seed contributions. Requires DATABASE_URL:
//   npx tsx scripts/seed-contributions.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { seedContributions } from "../lib/db/queries.ts";
import { nodeToSeedPayload } from "../lib/contribute/seed.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(readFileSync(join(__dirname, "..", "data", "graph.json"), "utf8"));
const rows = [
  ...graph.nodes.map((n) => ({ id: n.id, payload: nodeToSeedPayload(n, "move") })),
  ...graph.threats.map((t) => ({ id: t.id, payload: nodeToSeedPayload(t, "threat") })),
];
const added = await seedContributions(rows);
console.log(`seeded ${added} new contribution(s) (of ${rows.length} graph entries; existing ids skipped)`);
