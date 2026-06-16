/* eslint-disable @typescript-eslint/no-explicit-any -- contributions is a loosely-typed
   crowdsource blob (per-node edit/source maps); typed as any to match the prototype. */
import { S } from "@/lib/styles";
import type { ModelNode } from "@/lib/types";

interface ReviewBadgeProps {
  node: ModelNode;
  contributions: any;
}

export default function ReviewBadge({ node, contributions }: ReviewBadgeProps) {
  const proposed = contributions.edits && contributions.edits[node.id];
  if (proposed) return <span style={{ ...S.metaBadge, color: "#7fb2ff", borderColor: "#7fb2ff" }}>● has community edit</span>;
  if ((node as any).researched === false) return <span style={{ ...S.metaBadge, color: "#f0c468", borderColor: "#f0c468" }}>○ needs verification</span>;
  return null; // verification is now live-driven by VoteControl (DB badge), not a static seed label
}
