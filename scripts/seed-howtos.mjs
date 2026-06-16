#!/usr/bin/env node
// Idempotent ingest of built-in how-tos (data/howtos.ts) as verified how-to
// contributions. Requires DATABASE_URL: npx tsx scripts/seed-howtos.mjs
import { HOWTOS } from "../data/howtos.ts";
import { seedHowtos } from "../lib/db/queries.ts";
import { howtoToSeedPayload } from "../lib/contribute/seed.ts";

const rows = Object.entries(HOWTOS).map(([nodeId, h]) => ({ id: `howto:${nodeId}`, payload: howtoToSeedPayload(nodeId, h) }));
const added = await seedHowtos(rows);
console.log(`seeded ${added} new how-to(s) (of ${rows.length}; existing ids skipped)`);
