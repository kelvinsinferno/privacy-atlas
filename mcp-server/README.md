# privacy-atlas-mcp-server

An MCP (Model Context Protocol) server that exposes the **Privacy Atlas** knowledge graph — moves (solutions), threats, and personalized paths — so **any MCP-capable AI** can reason about a person's privacy with full live context.

The point: a user connects **their own** assistant (Claude, ChatGPT, Grok, Perplexity, Cursor, …) to the atlas. Their AI, their tokens, the conversation never touches Privacy Atlas servers. *Own your context; let any AI read it.* This is the privacy-maximalist third door alongside the embedded Grok assistant and the prompt jump-out.

## What it exposes

**Tools** (all read-only, `markdown` or `json` output):
- `atlas_search_moves(query, domain?)` — find moves by keyword/domain
- `atlas_get_move(move)` — full dossier of one move (summary, **caveat**, **failure mode**, cost, what it defends against, prerequisites, sources) by id or label
- `atlas_list_threats(domain?)` — threats, their counters, and residual risk
- `atlas_counters_for_threat(threat)` — the moves that defeat a given threat
- `atlas_build_path(worry, friction, level)` — an ordered, profile-specific plan (same engine as the website; prerequisites placed first)
- `atlas_coverage(done[])` — given completed move ids, which threats are beaten / weakened / exposed (same logic that paints the "living web")

**Resources:**
- `privacy-atlas://overview` — llms.txt-style overview (domains, tools, every move by domain)
- `privacy-atlas://graph` — the complete graph JSON

Design honors the product's invariants: honesty fields (caveat/failureMode/residual) are surfaced, not hidden; threats are "countered"/"weakened", never "neutralized"; every move carries sources.

## Run

```bash
npm install
npm run build

# local clients (Claude Desktop, Cursor, VS Code) — stdio:
npm start

# remote clients (Claude/ChatGPT/Grok/Perplexity web) — streamable HTTP:
npm run start:http      # serves POST /mcp on :3000, plus GET /healthz
```

The graph loads from `data/privacy-graph.json` (override with `PRIVACY_ATLAS_GRAPH=/path/to.json`). Keep this file in sync with the canonical graph the site ships — to resync: `node sync-graph.mjs` (run from `mcp-server/`).

## Deploy (production)

Serve the HTTP transport behind TLS at a stable URL (the app advertises `https://mcp.privacyatlas.xyz/mcp`). Stateless JSON responses make it horizontally scalable — run N replicas behind a load balancer; no session affinity needed. Add OAuth (the SDK supports it) so clients can authorize; the in-app "Connect your AI" screen already walks users through the per-client connect flow. To reach true one-click for end users, submit to the clients' reviewed connector directories (Anthropic's, etc.).

Because the data is public knowledge, there is no user data here to protect — but **log nothing that identifies a querying user** (no IPs, no query text tied to identity). The server's privacy promise is that connecting your AI reveals nothing about you to us.

## Keeping it current

This server is also the surface the planned **AI maintainer agent** uses: it reads the same graph and can submit proposed updates through the website's review pipeline. When `privacy-graph-v2.json` changes, redeploy with the new `data/privacy-graph.json` (or point `PRIVACY_ATLAS_GRAPH` at the live file).

## Tested

`npm run build` compiles clean; an SDK client over stdio successfully lists all 6 tools + 2 resources and exercises search / counters / build_path / coverage / get_move against the real graph (101 moves, 33 threats, 307 edges).
