# Privacy Atlas

A privacy **knowledge graph** as a living web: concrete "moves" (defenses you can take), the
threats they counter, honest caveats and failure modes, a personalized path, and a
community-maintained layer kept current by contributors. Built to be **honest first** — every
move carries what it *doesn't* solve — and **local-first** — your progress and profile stay on
your device.

It ships as three pieces:
- the **Next.js app** (the web experience + the crowdsourcing/AI APIs),
- **`mcp-server/`** — an MCP server exposing the graph so any MCP-capable AI can reason over it
  with the user's own tokens ("own your context; let any AI access it"), and
- **`extension/`** — a browser extension.

## Develop

```bash
npm install
npm run dev      # the app
npm run gate     # typecheck + lint + tests + audit
npm run build
```
`mcp-server/` and `extension/` are separate packages with their own `build`/`test`.

## Licensing

Privacy Atlas is **open**, in two layers:

| | License | Covers |
|---|---|---|
| **Code** | [AGPL-3.0](./LICENSE) | the app, `mcp-server/`, `extension/` |
| **Knowledge content** | [CC BY-SA 4.0](./LICENSE-CONTENT.md) | the curated graph (`data/`) + all community contributions |

Open source is a feature here, not an afterthought: a privacy tool's "we store nothing /
your data is local" claims are only as trustworthy as code you can read. Under the AGPL,
anyone who runs a modified version as a network service must make their changes available to
its users. The knowledge stays a CC BY-SA commons anyone can build on.

> **Deploy note (AGPL §13):** a public deployment must offer its users the Corresponding
> Source — add a visible "Source" link in the app pointing to this repository.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for how to contribute and the terms that apply.
