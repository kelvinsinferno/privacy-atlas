#!/usr/bin/env node
// Copies the canonical site graph into the MCP server's data directory.
// Run from the mcp-server/ directory: node sync-graph.mjs
import { copyFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "data", "graph.json");
const dst = join(__dirname, "data", "privacy-graph.json");

copyFileSync(src, dst);
const bytes = statSync(dst).size;
console.log(`synced: data/graph.json → data/privacy-graph.json (${bytes} bytes)`);
