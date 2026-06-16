/**
 * lib/jsonld.ts — pure function that builds a schema.org JSON-LD object for a node.
 *
 * SECURITY: input is a graph Node (server-controlled open data). Zero user data.
 * Pure: no DOM, no storage, no side effects.
 */

import type { ModelNode } from "@/lib/types";
import { HOWTOS } from "@/data/howtos";

/** A schema.org HowToStep object. */
interface HowToStep {
  "@type": "HowToStep";
  text: string;
}

/** The JSON-LD object returned for a node. */
export interface NodeJsonLd {
  "@context": "https://schema.org";
  "@type": "HowTo" | "DefinedTerm";
  name: string;
  description: string;
  step?: HowToStep[];
  inDefinedTermSet?: string;
}

/**
 * Build a schema.org JSON-LD object for a graph node.
 *
 * - Nodes with howto steps → HowTo with step array
 * - All others → DefinedTerm (a named, described concept in a controlled vocabulary)
 *
 * @param node - A ModelNode (Node or Threat) from the graph.
 * @returns A plain schema.org JSON-LD object (no JSON serialisation applied).
 */
export function nodeJsonLd(node: ModelNode): NodeJsonLd {
  const summary: string =
    (node as { summary?: string; residual?: string }).summary ??
    (node as { residual?: string }).residual ??
    "";
  const howto = HOWTOS[(node as { id: string }).id];

  if (howto && Array.isArray(howto.steps) && howto.steps.length > 0) {
    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: node.label,
      description: summary,
      step: howto.steps.map((text) => ({
        "@type": "HowToStep",
        text,
      })),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: node.label,
    description: summary,
    inDefinedTermSet: "https://privacy-atlas.app/api/knowledge",
  };
}

/**
 * Serialize a JSON-LD object to a string safe for embedding in
 * a <script type="application/ld+json"> tag.
 *
 * Escapes `<`, `>`, and `&` so they cannot break out of the script tag
 * or be misinterpreted as HTML. This guards against the </script>-injection
 * XSS vector even when graph data is community-sourced in future.
 */
export function safeJsonLdString(obj: NodeJsonLd): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
