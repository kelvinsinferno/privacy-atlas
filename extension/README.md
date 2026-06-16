# Privacy Atlas — Browser Extension

The Privacy Atlas browser extension is the companion to the Privacy Atlas web app.
It names the **Privacy Atlas move** that defends against what's tracking you on a
page. It bridges the gap between raw tracker signals and actionable privacy advice:
you see a tracker → the extension maps it to a leak class → a threat → the
counter-moves you can take in the Atlas.

> **On-device. No blocking. Nothing leaves your browser.**
> The lens provides meaning, not blocking — uBlock Origin and Privacy Badger do
> blocking. The lens tells you *what* is tracking you and *which defensive move*
> addresses it.

---

## Privacy Non-Negotiables

| Principle | What it means |
|-----------|--------------|
| **All analysis on-device** | Every classification runs in the service worker. No page content, URLs, or tracker hits are transmitted anywhere. |
| **Zero telemetry** | The extension contains no analytics, crash reporters, or usage beacons. |
| **Nothing leaves the browser** | The only network egress is the user explicitly clicking "open in Atlas". |
| **Bundled detection lists** | Tracker Radar and the leak-map are bundled at build time. No CDN calls at runtime. |
| **Open source** | The full source is auditable; see the `Source` link in Settings. |

---

## Architecture

```
Page context
  └─ detector.content.ts   — PerformanceObserver (resource timing) +
  └─ fp-hook.js            — canvas (toDataURL) fingerprint hook (injected)
       │  signals
       ▼
Service worker (background.ts)
  ├─ classifier.ts         — maps signals → threat hits (using bundled data)
  ├─ alert-engine.ts       — adopt vs apply logic + badge count
  └─ storage.ts            — settings & per-site mutes (browser.storage.local)
       │  alerts
       ├─▶ Shadow-DOM toast  — components/toast.ts (app-styled)
       └─▶ Toolbar badge     — amber count badge on the extension icon

privacyatlas.xyz pages
  └─ atlas-bridge.content.ts — mirrors localStorage key `pa:priv:journeyProgress`
                               so the lens knows adopt vs apply context
```

The classifier and alert-engine are the lens's core logic. If the leak→move
mapping changes, edit `data/leak-map.json` (main repo) and re-run `node sync.mjs`.

---

## Run / Develop

**Install dependencies (once):**

```bash
cd extension/
npm install
```

**Sync bundled data from the main repo (run whenever `data/graph.json` or
`data/leak-map.json` change):**

```bash
node sync.mjs
# synced: leak-map.json + graph-subset.json (33 threats, 73 moves)
```

**Dev server (hot-reload, Chrome):**

```bash
npm run dev
```

**Production builds:**

```bash
npm run build            # Chrome MV3  →  .output/chrome-mv3/
npm run build:firefox    # Firefox MV2 →  .output/firefox-mv2/
npm run build:safari     # Safari MV2  →  .output/safari-mv2/  (web-extension assets only)
```

**Quality gate (typecheck + lint + tests + audit):**

```bash
npm run gate
```

**End-to-end test (Chromium, Playwright):**

```bash
npm run e2e
```

---

## Load Unpacked (per Browser)

### Chrome / Edge

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `extension/.output/chrome-mv3` directory
5. The Privacy Atlas icon appears in the toolbar

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Navigate into `extension/.output/firefox-mv2/` and select `manifest.json`
4. The extension loads until the browser is closed (temporary — sign with AMO for persistent install)

### Safari (macOS + Xcode required)

wxt produces the web-extension assets in `.output/safari-mv2/`. Converting them
into a native Safari extension requires macOS and Xcode:

```bash
# Run on macOS with Xcode installed:
xcrun safari-web-extension-converter extension/.output/safari-mv2/ \
    --project-location ~/Desktop \
    --app-name "Privacy Atlas"
```

Open the generated Xcode project, enable the extension target in Xcode → Product
→ Scheme, and run it. In Safari: Preferences → Extensions → enable Privacy Atlas.

> This Xcode wrapping step is **macOS-only**. The wxt build (producing
> `.output/safari-mv2/`) runs on any platform; the `xcrun` conversion requires a
> Mac with Xcode. See `docs/DEPLOY-EXTENSION.md` for the full store submission
> runbook.

---

## Data Sync Discipline

`data/leak-map.json` in the **main repo root** is the source of truth for the
leak-class → threat bridge. Counter-moves derive from each threat's `counters`
array in `data/graph.json`.

`node sync.mjs` (run from `extension/`) regenerates two files:

| Generated file | Contents |
|---------------|---------|
| `extension/data/leak-map.json` | verbatim copy of `data/leak-map.json` |
| `extension/data/graph-subset.json` | threats (id, label, residual, counters) + counter-move nodes (id, label, summary, domain) |

Both generated files are **gitignored** — regenerate them locally or in CI
before every build. The Tracker Radar seed (`tracker-radar.min.json`) is
committed.

---

## Tracker Radar

`extension/data/tracker-radar.min.json` is generated from
[DuckDuckGo's compiled Tracker Data Set](https://github.com/duckduckgo/tracker-radar)
(~725 trackers) merged with the hand-curated overrides in
`data/tracker-radar.seed.json`. It is normalized to the five `LeakClass`
values used by the classifier:

| LeakClass | DDG categories mapped |
|-----------|----------------------|
| `advertising` | Advertising, Ad Motivated Tracking, Ad Fraud, Action Pixels |
| `analytics` | Analytics, Third-Party Analytics Marketing, Audience Measurement, Tag Manager |
| `fingerprinting` | DDG fingerprinting score ≥ 2 |
| `session-replay` | Session Replay |
| `social` | Social Network, Social - Share, Social - Comment |

**To refresh the dataset**, run the generator (requires network):

```bash
cd extension/
node scripts/gen-tracker-radar.mjs
```

This fetches the latest DDG TDS, maps categories to our five `LeakClass`
values, merges the curated seed (union categories — hand-tuned mappings like
`connect.facebook.net`→social survive even if DDG doesn't tag them), and
writes the committed `tracker-radar.min.json`.

**Attribution:** Tracker data derived from
[DuckDuckGo Tracker Radar](https://github.com/duckduckgo/tracker-radar),
licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
The curated overrides live in `data/tracker-radar.seed.json`.
The NC term applies — this extension is free and open-source, with no
commercial use of the tracker data itself.

---

## Styling

The extension UI mirrors the Privacy Atlas web app via token-based styles in
`extension/styles.ts`. These tokens (colors, fonts, radii) are kept in step
with the app's `lib/styles.ts`. Do not use Tailwind or external CSS frameworks
in the extension — keep tokens synchronized with the app instead.

---

## Engine Parity

The classifier and alert-engine are the lens's logic layer. They are
**separate** from the path and coverage engines, which live in the website
(`lib/path.ts`) and MCP server (`mcp-server/src/graph.ts`).

If the leak→move mapping changes: edit `data/leak-map.json` (main repo) and
re-run `node sync.mjs`. If coverage or path logic changes: update the website
and MCP server; no extension changes are required.
