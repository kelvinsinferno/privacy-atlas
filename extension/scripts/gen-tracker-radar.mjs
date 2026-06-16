#!/usr/bin/env node
// Regenerate extension/data/tracker-radar.min.json from DuckDuckGo's compiled Tracker Data Set
// (CC BY-NC-SA 4.0 — https://github.com/duckduckgo/tracker-radar), merged with the curated seed
// (tracker-radar.seed.json). Requires network. Run from extension/:  node scripts/gen-tracker-radar.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

const TDS_URL = "https://staticcdn.duckduckgo.com/trackerblocking/v5/current/extension-tds.json";
const CATEGORY_MAP = {
  "Advertising": "advertising", "Ad Motivated Tracking": "advertising", "Ad Fraud": "advertising", "Action Pixels": "advertising",
  "Analytics": "analytics", "Third-Party Analytics Marketing": "analytics", "Audience Measurement": "analytics", "Tag Manager": "analytics",
  "Session Replay": "session-replay",
  "Social Network": "social", "Social - Share": "social", "Social - Comment": "social",
};
const FP_THRESHOLD = 2;

const res = await fetch(TDS_URL);
if (!res.ok) throw new Error("TDS fetch failed: " + res.status);
const tds = await res.json();

const out = {};
for (const [host, e] of Object.entries(tds.trackers || {})) {
  const cls = new Set();
  for (const c of (e.categories || [])) if (CATEGORY_MAP[c]) cls.add(CATEGORY_MAP[c]);
  if ((e.fingerprinting || 0) >= FP_THRESHOLD) cls.add("fingerprinting");
  if (cls.size === 0) continue;
  out[host] = { entity: (e.owner && e.owner.displayName) || "Unknown", categories: [...cls] };
}

// Merge curated seed (union categories; seed entity wins). Keeps hand-tuned mappings DDG lacks.
const seed = JSON.parse(readFileSync(join(dataDir, "tracker-radar.seed.json"), "utf8"));
for (const [host, s] of Object.entries(seed)) {
  const prev = out[host];
  const cats = new Set([...(prev ? prev.categories : []), ...s.categories]);
  out[host] = { entity: s.entity || (prev && prev.entity) || "Unknown", categories: [...cats] };
}

const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
writeFileSync(join(dataDir, "tracker-radar.min.json"), JSON.stringify(sorted, null, 2) + "\n");
console.log(`generated tracker-radar.min.json: ${Object.keys(sorted).length} trackers (DDG TDS + curated seed)`);
