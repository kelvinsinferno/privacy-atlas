"use client";

import { DOMAIN, TRAJ, TRAJ_W } from "@/data/ui-maps";
import { S } from "@/lib/styles";
import CostDot from "@/components/common/CostDot";
import type { PathEntry } from "@/lib/path";

interface PathItemProps {
  item: PathEntry;
  idx: number | null;
  onExplore: (id: string | null) => void;
}

export default function PathItem({ item, idx: _idx, onExplore }: PathItemProps) {
  const { node, counters, urgency } = item;
  const col = DOMAIN[node.domain]?.c || "#fff";
  const topThreat = counters.slice().sort((a, b) => (TRAJ_W[b.trajectory] - TRAJ_W[a.trajectory]))[0];
  return (
    <div style={S.pathItem} data-pi onClick={() => onExplore(node.id)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: col, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: "#fff", fontSize: 14, fontFamily: "Georgia, serif" }}>{node.label}</span>
            <span style={S.domTag}>{DOMAIN[node.domain]?.label}</span>
            {node.actionability === "awareness" && <span style={{ ...S.miniTag, color: "#f0c468", borderColor: "#3a3520" }}>awareness</span>}
          </div>
          <div style={S.pathSummary}>
            {node.summary.length > 130 ? node.summary.slice(0, 128) + "…" : node.summary}
          </div>
          {topThreat && (
            <div style={{ ...S.tiny, color: "#cf8", marginTop: 3 }}>
              ↳ stops <span style={{ color: TRAJ[topThreat.trajectory] }}>{topThreat.label}</span>
              {counters.length > 1 ? ` +${counters.length - 1} more` : ""}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {node.cost && (
          <div style={{ display: "flex", gap: 4 }}>
            <CostDot k="$" v={node.cost.money} map={{ none: "free", low: "$", med: "$$", high: "$$$" }} />
            <CostDot k="⟳" v={node.cost.friction} map={{ low: "easy", med: "med", high: "hard" }} />
          </div>
        )}
        {urgency >= 4 && <span style={S.urgentTag}>● urgent</span>}
        <span style={{ color: "#3a4250", fontSize: 17 }}>›</span>
      </div>
    </div>
  );
}
