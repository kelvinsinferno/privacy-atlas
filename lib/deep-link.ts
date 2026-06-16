export type DeepLink = { kind: "threat" | "node"; id: string } | null;

/** Parse a location.search string into a deep-link selection. */
export function parseDeepLink(search: string): DeepLink {
  const params = new URLSearchParams(search);
  const threat = params.get("threat");
  if (threat) return { kind: "threat", id: threat };
  const node = params.get("node");
  if (node) return { kind: "node", id: node };
  return null;
}
