#!/usr/bin/env node
// Merge VERIFIED community contributions into data/graph.json.
// Maintainer-run, the FINAL human gate. Requires DATABASE_URL. Run with:
//   npx tsx scripts/bake-contributions.mjs
// then review the diff, commit data/graph.json, run `npm run build`, and redeploy
// (which re-syncs the bundled extension + MCP data).
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listContributions, listRemovedIds } from "../lib/db/queries.ts";
import { mergeVerifiedIntoGraph, pruneFromGraph } from "../lib/contribute/bake.ts";
import { buildCommunityLayer } from "../lib/contribute/community-bake.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const graphPath = join(__dirname, "..", "data", "graph.json");
const graph = JSON.parse(readFileSync(graphPath, "utf8"));
const all = await listContributions();
const verified = all.filter((c) => c.status === "verified");
const removedIds = await listRemovedIds();
const merged = pruneFromGraph(mergeVerifiedIntoGraph(graph, verified), removedIds);
writeFileSync(graphPath, JSON.stringify(merged, null, 2) + "\n");
console.log(`baked ${verified.length} verified, pruned ${removedIds.length} removed -> data/graph.json (review the diff, then commit + build)`);

const layer = buildCommunityLayer(all);
const dataDir = join(__dirname, "..", "data");
writeFileSync(join(dataDir, "community-howtos.json"), JSON.stringify(layer.howtos, null, 2) + "\n");
writeFileSync(join(dataDir, "community-resources.json"), JSON.stringify(layer.resources, null, 2) + "\n");
writeFileSync(join(dataDir, "community-sources.json"), JSON.stringify(layer.sources, null, 2) + "\n");
writeFileSync(join(dataDir, "community-regions.json"), JSON.stringify(layer.regions, null, 2) + "\n");
console.log(`community layer: ${Object.keys(layer.howtos).length} howto-node(s), ${Object.keys(layer.resources).length} resource-node(s), ${Object.keys(layer.sources).length} source-node(s), ${Object.keys(layer.regions).length} region-node(s)`);
