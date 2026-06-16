#!/usr/bin/env node
// Privacy Atlas MCP server.
// Exposes the Privacy Atlas knowledge graph as MCP tools + resources so any MCP-capable
// AI (the user's own Claude, ChatGPT, Grok, Perplexity, Cursor, etc.) can reason about a
// user's privacy options with full live context — the user's AI, the user's tokens, and
// nothing flowing through Privacy Atlas servers. "Own your context; let any AI access it."

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { ResponseFormat, type MoveNode, type Friction } from "./types.js";
import { registerMaintainerTools } from "./maintainer-tools.js";
import { maintainerGate } from "./maintainer-client.js";
import {
  GRAPH,
  domainList,
  searchMoves,
  resolveMove,
  resolveThreat,
  countersForThreat,
  buildPath,
  coverage,
  relationsOf,
  moveSummaryLine,
  overviewMarkdown,
  truncate,
} from "./graph.js";

const server = new McpServer({ name: "privacy-atlas-mcp-server", version: "1.0.0" });

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const fmt = () =>
  z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");
const json = (obj: unknown) => ({ content: [{ type: "text" as const, text: truncate(JSON.stringify(obj, null, 2)) }], structuredContent: obj as Record<string, unknown> });
const md = (text: string, structured: unknown) => ({ content: [{ type: "text" as const, text: truncate(text) }], structuredContent: structured as Record<string, unknown> });

function moveDetail(m: MoveNode): Record<string, unknown> {
  const rel = relationsOf(m.id);
  return {
    id: m.id, label: m.label, domain: m.domain, tier: m.tier, weight: m.weight,
    summary: m.summary, caveat: m.caveat, failureMode: m.failureMode, residual: m.residual,
    cost: m.cost, defendsAgainst: rel.counters, prerequisites: rel.prereqs,
    enables: rel.enables, sequenceAfter: rel.sequenceAfter, tensions: rel.tensions, reveals: rel.reveals,
    sources: (m.sources || []).map((s) => ({ title: s.title, url: s.url })),
    ceiling: m.ceiling, regionScope: m.regionScope,
  };
}

// ---- atlas_search_moves -----------------------------------------------------
server.registerTool("atlas_search_moves", {
  title: "Search privacy moves",
  description: `Search Privacy Atlas for "moves" (concrete privacy defenses a person can take) by keyword, optionally scoped to a domain.

Args:
  - query (string): keywords to match against move label, summary, and id
  - domain (string, optional): one of ${domainList().join(", ")}
  - response_format ('markdown'|'json'): default 'markdown'

Returns a ranked list of matching moves with id, label, domain, tier, cost, and a short summary. Use atlas_get_move for full detail on any result.`,
  inputSchema: {
    query: z.string().min(2, "query must be at least 2 characters").describe("keywords, e.g. 'email aliases' or 'facial recognition'"),
    domain: z.enum(domainList() as [string, ...string[]]).optional().describe("restrict to a domain"),
    response_format: fmt(),
  },
  annotations: RO,
}, async ({ query, domain, response_format }) => {
  const results = searchMoves(query, domain);
  if (!results.length) return { content: [{ type: "text", text: `No moves found matching '${query}'${domain ? ` in domain '${domain}'` : ""}. Try broader keywords or atlas_list_threats.` }] };
  const structured = { count: results.length, moves: results.map((m) => ({ id: m.id, label: m.label, domain: m.domain, tier: m.tier, cost: m.cost, summary: m.summary })) };
  if (response_format === ResponseFormat.JSON) return json(structured);
  return md(`Found ${results.length} move(s) for "${query}":\n\n` + results.map(moveSummaryLine).join("\n"), structured);
});

// ---- atlas_get_move ---------------------------------------------------------
server.registerTool("atlas_get_move", {
  title: "Get a privacy move in full",
  description: `Get the complete detail of a single Privacy Atlas move: what it does, its honest caveat and failure mode, cost, the threats it defends against, its prerequisites and sequencing, and verifiable sources.

Args:
  - move (string): a move id (e.g. 'email-aliasing') OR its exact/partial label
  - response_format ('markdown'|'json'): default 'markdown'

Returns the move's full dossier. Honesty fields (caveat, failureMode, residual) are integral — always surface them; never present a move as a guarantee.`,
  inputSchema: {
    move: z.string().min(2).describe("move id or label, e.g. 'masked-cards' or 'Pay with masked / virtual cards'"),
    response_format: fmt(),
  },
  annotations: RO,
}, async ({ move, response_format }) => {
  const m = resolveMove(move);
  if (!m) return { content: [{ type: "text", text: `No move matches '${move}'. Use atlas_search_moves to find the right id.` }] };
  const d = moveDetail(m);
  if (response_format === ResponseFormat.JSON) return json(d);
  const lines = [
    `# ${m.label}  \`${m.id}\``,
    `Domain: ${m.domain} · tier ${m.tier ?? "?"} · cost: ${m.cost?.money ?? "?"} money / ${m.cost?.friction ?? "?"} effort / ${m.cost?.maintenance ?? "?"} upkeep`,
    "",
    m.summary || "",
    m.caveat ? `\n**Caveat:** ${m.caveat}` : "",
    m.failureMode ? `\n**How it fails:** ${m.failureMode}` : "",
    (d.defendsAgainst as string[]).length ? `\n**Defends against:** ${(d.defendsAgainst as string[]).join(", ")}` : "",
    (d.prerequisites as string[]).length ? `**Do first:** ${(d.prerequisites as string[]).join(", ")}` : "",
    (d.tensions as string[]).length ? `**Trades off against:** ${(d.tensions as string[]).join(", ")}` : "",
    (m.sources || []).length ? `\n**Sources:**\n` + (m.sources || []).map((s) => `- ${s.title || s.url}${s.url ? ` (${s.url})` : ""}`).join("\n") : "",
  ];
  return md(lines.filter(Boolean).join("\n"), d);
});

// ---- atlas_list_threats -----------------------------------------------------
server.registerTool("atlas_list_threats", {
  title: "List privacy threats",
  description: `List the privacy threats Privacy Atlas tracks, optionally scoped to a domain, each with the moves that counter it and its residual risk.

Args:
  - domain (string, optional): one of ${domainList().join(", ")}
  - response_format ('markdown'|'json'): default 'markdown'

Returns threats with id, label, trajectory, the moves that counter them, and the residual risk that remains even when countered.`,
  inputSchema: {
    domain: z.enum(domainList() as [string, ...string[]]).optional().describe("restrict to a domain"),
    response_format: fmt(),
  },
  annotations: RO,
}, async ({ domain, response_format }) => {
  const threats = GRAPH.threats.filter((t) => !domain || t.domain === domain);
  const structured = {
    count: threats.length,
    threats: threats.map((t) => ({ id: t.id, label: t.label, domain: t.domain, trajectory: t.trajectory, counteredBy: countersForThreat(t).map((m) => m.id), residual: t.residual })),
  };
  if (response_format === ResponseFormat.JSON) return json(structured);
  const text = `${threats.length} threat(s)${domain ? ` in '${domain}'` : ""}:\n\n` + threats.map((t) => {
    const cs = countersForThreat(t).map((m) => m.label);
    return `### ${t.label}  \`${t.id}\`\n- trajectory: ${t.trajectory || "?"}\n- defeated by: ${cs.length ? cs.join(", ") : "no individual move (policy/structural)"}\n- residual: ${t.residual || "—"}`;
  }).join("\n\n");
  return md(text, structured);
});

// ---- atlas_counters_for_threat ----------------------------------------------
server.registerTool("atlas_counters_for_threat", {
  title: "What defeats a threat",
  description: `Given a privacy threat, return the moves that counter it (solutions-forward), each with cost and summary, plus the threat's residual risk.

Args:
  - threat (string): a threat id (e.g. 'T-BROKER') OR its exact/partial label
  - response_format ('markdown'|'json'): default 'markdown'

Returns the ordered set of countering moves. If a threat has no individual move counter, that is stated explicitly (some threats are only addressable structurally/politically).`,
  inputSchema: {
    threat: z.string().min(2).describe("threat id or label, e.g. 'T-BROKER' or 'data broker'"),
    response_format: fmt(),
  },
  annotations: RO,
}, async ({ threat, response_format }) => {
  const t = resolveThreat(threat);
  if (!t) return { content: [{ type: "text", text: `No threat matches '${threat}'. Use atlas_list_threats to see all threats.` }] };
  const cs = countersForThreat(t);
  const structured = { threat: { id: t.id, label: t.label, residual: t.residual }, counters: cs.map((m) => ({ id: m.id, label: m.label, domain: m.domain, cost: m.cost, summary: m.summary })) };
  if (response_format === ResponseFormat.JSON) return json(structured);
  const text = cs.length
    ? `## What defeats "${t.label}"\n\n` + cs.map(moveSummaryLine).join("\n") + `\n\n**Residual risk (remains even when countered):** ${t.residual || "—"}`
    : `"${t.label}" has no individual move that counters it — it is addressable only structurally or politically.\n\n**Residual risk:** ${t.residual || "—"}`;
  return md(text, structured);
});

// ---- atlas_build_path -------------------------------------------------------
server.registerTool("atlas_build_path", {
  title: "Build a personalized privacy path",
  description: `Build an ordered, profile-specific sequence of moves — the same engine the Privacy Atlas website uses. Prerequisites are placed before the moves that need them.

Args:
  - worry ('brokers'|'person'|'crime'|'state'|'broad'): the user's primary concern — data brokers, a specific person/stalker, identity crime, state/legal surveillance, or broad/general
  - friction ('none'|'low'|'med'|'high'): the maximum effort the user will sustain (caps which moves are included)
  - level (1-5): how deep to go; 1 = foundational only, 5 = includes the most advanced/invasive moves
  - response_format ('markdown'|'json'): default 'markdown'

Returns an ordered list of moves. Present it as a starting plan, not a mandate; remind the user each move has caveats (fetch with atlas_get_move).`,
  inputSchema: {
    worry: z.enum(["brokers", "person", "crime", "state", "broad"]).describe("primary concern"),
    friction: z.enum(["none", "low", "med", "high"]).default("med").describe("max sustained effort"),
    level: z.number().int().min(1).max(5).default(3).describe("depth, 1 (foundational) to 5 (advanced)"),
    response_format: fmt(),
  },
  annotations: RO,
}, async ({ worry, friction, level, response_format }) => {
  const path = buildPath(worry, friction as Friction, level);
  const structured = { profile: { worry, friction, level }, count: path.length, path: path.map((m, i) => ({ step: i + 1, id: m.id, label: m.label, domain: m.domain, tier: m.tier, cost: m.cost })) };
  if (response_format === ResponseFormat.JSON) return json(structured);
  const text = `# Your Privacy Atlas path\nProfile: worried about **${worry}**, effort ≤ **${friction}**, depth **${level}**. ${path.length} moves, in order:\n\n` +
    path.map((m, i) => `${i + 1}. **${m.label}** \`${m.id}\` — ${m.domain}, ${m.cost?.friction ?? "?"} effort`).join("\n") +
    `\n\nEach move has caveats and failure modes — fetch any with atlas_get_move before relying on it.`;
  return md(text, structured);
});

// ---- atlas_coverage ---------------------------------------------------------
server.registerTool("atlas_coverage", {
  title: "Assess threat coverage from completed moves",
  description: `Given the moves a user has already completed, report which threats are beaten, weakened, or still exposed — the same logic that paints the Privacy Atlas "living web".

Args:
  - done (string[]): move ids the user has completed (e.g. ['encrypted-messaging','strong-2fa'])
  - response_format ('markdown'|'json'): default 'markdown'

Returns per-threat coverage (countered/total, status), and the still-exposed threats sorted first. Threats are "beaten"/"weakened", never "neutralized" — residual risk always remains.`,
  inputSchema: {
    done: z.array(z.string()).min(1, "provide at least one completed move id").describe("completed move ids"),
    response_format: fmt(),
  },
  annotations: RO,
}, async ({ done, response_format }) => {
  const cov = coverage(done).sort((a, b) => a.fraction - b.fraction);
  const beaten = cov.filter((c) => c.status === "beaten").length;
  const weakened = cov.filter((c) => c.status === "weakened").length;
  const structured = { summary: { movesDone: done.length, threatsBeaten: beaten, threatsWeakened: weakened, threatsTracked: cov.length }, threats: cov };
  if (response_format === ResponseFormat.JSON) return json(structured);
  const text = `# Coverage from ${done.length} completed move(s)\n${beaten} threat(s) fully countered · ${weakened} weakened · ${cov.length - beaten - weakened} still exposed.\n\n` +
    cov.map((c) => `- [${c.status}] **${c.label}** — ${c.countered}/${c.total} counters done${c.status !== "beaten" && c.residual ? ` · residual: ${c.residual}` : ""}`).join("\n");
  return md(text, structured);
});

// ---- resources --------------------------------------------------------------
server.registerResource(
  "overview",
  "privacy-atlas://overview",
  { title: "Privacy Atlas overview", description: "llms.txt-style overview of the whole atlas: domains, tools, and every move by domain.", mimeType: "text/markdown" },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: overviewMarkdown() }] })
);

server.registerResource(
  "graph",
  "privacy-atlas://graph",
  { title: "Privacy Atlas full graph (JSON)", description: "The complete knowledge graph: nodes (moves), threats, and edges.", mimeType: "application/json" },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(GRAPH) }] })
);

// ---- transports -------------------------------------------------------------
async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("privacy-atlas-mcp-server running on stdio");
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  // Maintainer write-tools — SEPARATE, key-gated endpoint. The public /mcp above stays read-only.
  const maintainerServer = new McpServer({ name: "privacy-atlas-maintainer", version: "1.0.0" });
  registerMaintainerTools(maintainerServer);
  app.post("/mcp-maintainer", async (req, res) => {
    if (!process.env.MAINTAINER_API_KEY) { res.status(503).json({ error: "maintainer not configured" }); return; }
    if (!maintainerGate(req.headers.authorization)) { res.status(401).json({ error: "unauthorized" }); return; }
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => transport.close());
    await maintainerServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  app.get("/healthz", (_req, res) => { res.json({ ok: true, version: GRAPH.version, moves: GRAPH.nodes.length, threats: GRAPH.threats.length }); });
  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => console.error(`privacy-atlas-mcp-server (HTTP) on http://localhost:${port}/mcp`));
}

const transport = process.env.TRANSPORT || "stdio";
(transport === "http" ? runHTTP() : runStdio()).catch((err) => { console.error("Server error:", err); process.exit(1); });
