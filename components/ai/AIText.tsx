"use client";

/* ---------- AIText (ref L441) ----------
   Renders assistant text where [[double brackets]] become clickable move chips.
   A bracketed token that matches a real graph node's label (case-insensitive)
   renders as a chip that calls onInspect(nodeId); anything else falls back to
   bold text. Verbatim port — no behavior change. */

import { GRAPH } from "@/data/graph";
import { S } from "@/lib/styles";

interface AITextProps {
  text: string;
  onInspect?: (id: string) => void;
}

export default function AIText({ text, onInspect }: AITextProps) {
  const parts = String(text).split(/(\[\[[^\]]+\]\])/g);
  return (
    <span>
      {parts.map((p, i) => {
        const m = p.match(/^\[\[([^\]]+)\]\]$/);
        if (!m) return <span key={i}>{p}</span>;
        const n = GRAPH.nodes.find((x) => x.label.toLowerCase() === m[1].toLowerCase());
        return n && onInspect ? (
          <button key={i} style={S.aiMoveChip} onClick={() => onInspect(n.id)}>
            {n.label} →
          </button>
        ) : (
          <b key={i} style={{ color: "#fff" }}>
            {m[1]}
          </b>
        );
      })}
    </span>
  );
}
