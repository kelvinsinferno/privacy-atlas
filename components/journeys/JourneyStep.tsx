"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- ModelNode is Node|Threat; cost/summary accessed
   via verbatim port casts; per-file disable is acceptable for loose node data (task spec). */

import { S } from "@/lib/styles";
import { DOMAIN, COSTC } from "@/data/ui-maps";
import { dueForRecheck } from "@/lib/score";
import type { ModelNode } from "@/lib/types";
import type { JourneyStep as JourneyStepData } from "@/data/journeys";

interface JourneyStepProps {
  n: ModelNode;
  pair: ModelNode | null;
  step: JourneyStepData;
  /** Step number within the mission (1-based counter) — kept for future display use. */
  num: number;
  done: Record<string, number | boolean>;
  toggle: (nodeId: string) => void;
  onExplore: (id: string | null) => void;
  onInspect: (id: string) => void;
  selected: string | null;
}

export default function JourneyStep({ n, pair, step, done, toggle, onExplore, onInspect, selected }: JourneyStepProps) {
  const col = DOMAIN[n.domain]?.c || "#fff";
  const isDone = !!done[n.id];
  const pairDone = pair ? !!done[pair.id] : true;
  const id = n.id;
  const sel = selected === id;
  return (
    <div
      style={{ ...S.journeyStep, borderColor: sel ? "#5fd3c8" : "#1a1f29", opacity: step.optional ? 0.92 : 1, cursor: "pointer" }}
      onClick={() => onInspect(id)}
      title="open how-to & details"
    >
      <button
        style={{ ...S.checkbox, ...(isDone ? S.checkboxOn : {}) }}
        onClick={(e) => { e.stopPropagation(); toggle(id); }}
        title="mark done"
      >
        {isDone ? "✓" : ""}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: col, flexShrink: 0 }} />
          <span style={{ color: "#fff", fontSize: 14, textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.6 : 1 }}>{n.label}</span>
          {step.highlight && <span style={{ ...S.miniTag, color: "#5fd3c8", borderColor: "#2a5d63" }}>{step.highlight}</span>}
          {step.optional && <span style={{ ...S.miniTag, color: "#f0c468", borderColor: "#3a3520" }}>optional</span>}
          {(n as any).cost && <span style={{ ...S.miniTag, color: COSTC[(n as any).cost.friction] }}>{({ low: "easy", med: "medium", high: "hard" } as Record<string, string>)[(n as any).cost.friction]}</span>}
          {dueForRecheck(n as any, done[id]) && <span style={{ ...S.miniTag, color: "#7fb2ff", borderColor: "#1d2c4d" }}>⟲ re-check due</span>}
        </div>
        <div style={{ fontSize: 12.5, color: "#9aa0b5", lineHeight: 1.5, marginTop: 4 }}>
          {(n as any).summary.length > 150 ? (n as any).summary.slice(0, 148) + "…" : (n as any).summary}
        </div>
        {step.optionalNote && <div style={{ ...S.tiny, color: "#969eb0", marginTop: 4, fontStyle: "italic" }}>{step.optionalNote}</div>}
        {pair && (
          <div style={S.pairBox}>
            <button
              style={{ ...S.checkbox, ...(pairDone ? S.checkboxOn : {}), width: 17, height: 17 }}
              onClick={(e) => { e.stopPropagation(); toggle(pair.id); }}
            >
              {pairDone ? "✓" : ""}
            </button>
            <div style={{ flex: 1 }}>
              <span style={{ color: "#d4dae6", fontSize: 14 }}>+ do together: <b style={{ color: "#fff" }}>{pair.label}</b></span>
              <div style={{ ...S.tiny, marginTop: 2 }}>{(pair as any).summary.length > 110 ? (pair as any).summary.slice(0, 108) + "…" : (pair as any).summary}</div>
              <button style={S.howLink} onClick={(e) => { e.stopPropagation(); onInspect(pair.id); }}>how-to &amp; details &rarr;</button>
            </div>
          </div>
        )}
        {/* the card itself opens how-to & details (onClick above) — only the distinct
            "see on the web" action needs an explicit link here. */}
        <div style={{ display: "flex", gap: 12, marginTop: 7 }}>
          <button style={S.howLink} onClick={(e) => { e.stopPropagation(); onExplore(id); }}>see on the web &uarr;</button>
        </div>
      </div>
    </div>
  );
}
