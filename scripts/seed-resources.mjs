#!/usr/bin/env node
// Idempotent ingest of built-in resources (data/resources.ts) as verified
// resource contributions. Requires DATABASE_URL: npx tsx scripts/seed-resources.mjs
import { RESOURCES } from "../data/resources.ts";
import { seedResources } from "../lib/db/queries.ts";
import { resourceToSeedPayload } from "../lib/contribute/seed.ts";

const rows = [];
for (const [nodeId, list] of Object.entries(RESOURCES)) {
  (list || []).forEach((r, i) => rows.push({ id: `res:${nodeId}:${i}`, payload: resourceToSeedPayload(nodeId, r) }));
}
const added = await seedResources(rows);
console.log(`seeded ${added} new resource(s) (of ${rows.length}; existing ids skipped)`);
