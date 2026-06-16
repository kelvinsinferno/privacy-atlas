# Contributing to Privacy Atlas

Contributions are welcome — both **knowledge** (privacy how-tos, resources, sources,
per-country region overlays, and proposed moves/threats, submitted through the in-app
forms or the API) and **code** (pull requests).

## Contributor terms

By submitting a contribution to Privacy Atlas — through the website, the API, or a pull
request — you certify that:

1. **It's yours to share.** The contribution is your own original work, or you otherwise
   have the right to submit it, and to your knowledge it doesn't infringe anyone's rights.
2. **You license it.** You license your contribution to the project and to the public
   under the project's licenses — **CC BY-SA 4.0** for knowledge content (how-tos,
   resources, sources, overlays, graph data) and **AGPL-3.0** for code.
3. **No private data.** You won't submit personal data (names, addresses, account
   details) — yours or anyone else's.

This is the same **inbound = outbound** model Wikipedia and OpenStreetMap use: your
contribution becomes part of an open commons that anyone — including you — can build on.
The project may display, adapt, redistribute, and bake your contribution into the graph
under those licenses. The website surfaces a short version of this notice at the point of
submission.

## How knowledge contributions are handled

Contributions publish immediately and are community-votable, but they earn the **"✓ verified"
badge** — and their source links only become clickable — **after maintainer review**. Keep
the honesty fields (caveats, failure modes, residual risk) intact: they are a feature of the
product, never marketing.

## Code contributions

- Run `npm run gate` (typecheck + lint + tests + audit) and `npm run build` before opening a PR.
- `mcp-server/` and `extension/` are separate packages with their own `build`/`test`.
- By the AGPL, anyone who runs a modified version of the code as a network service must make
  their modified source available to its users.

## License

See [`LICENSE`](./LICENSE) (code, AGPL-3.0) and [`LICENSE-CONTENT.md`](./LICENSE-CONTENT.md)
(knowledge content, CC BY-SA 4.0).
