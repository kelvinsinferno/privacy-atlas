"use client";
/* eslint-disable react/no-unescaped-entities -- copy-heavy board with verbatim copy from the prototype */

import { useState } from "react";
import type { CSSProperties } from "react";

import { GRAPH } from "@/data/graph";
import { DOMAIN } from "@/data/ui-maps";
import { S, mono } from "@/lib/styles";
import type { Model, ModelNode, Node } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

/** Narrowed ModelNode confirmed to be a defense move (kind === "node"). */
type MoveNode = ModelNode & { kind: "node" } & Node;

interface Props {
  model: Model;
  setSelected: (id: string | null) => void;
  onTrace: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  ThreatBoard — verbatim port of reference/PrivacyAtlas.jsx L2320–L2399 */
/* ------------------------------------------------------------------ */

export default function ThreatBoard({ model, setSelected, onTrace }: Props) {
  const { byId } = model;
  const [sort, setSort] = useState("actionable"); // actionable | urgent
  const TRAJ_ORDER: Record<string, number> = { exploding: 0, growing: 1, emerging: 2, steady: 3, variable: 3, shrinking: 4 };

  const rows = GRAPH.threats.map((t) => {
    const counters = (t.counters ?? [])
      .map((id) => byId.get(id))
      .filter((x): x is MoveNode => x !== undefined && x.kind === "node");
    return { t, counters };
  });
  rows.sort((a, b) => {
    if (sort === "urgent") return (TRAJ_ORDER[a.t.trajectory] - TRAJ_ORDER[b.t.trajectory]) || (b.t.tier - a.t.tier);
    // actionable: most counters first (you can do the most about it), then urgency
    return (b.counters.length - a.counters.length) || (TRAJ_ORDER[a.t.trajectory] - TRAJ_ORDER[b.t.trajectory]);
  });

  const noDefense = rows.filter((r) => r.counters.length === 0);

  return (
    <div style={S.threatWrap}>
      <div style={S.threatIntro}>
        <b style={{ color: "#fff" }}>Every threat here has an answer.</b> This is the adversary layer flipped around: each card leads with the moves that defeat or blunt it. The residual line is the honest part — what no defense fully removes — but the headline is what you can <span style={{ color: "#8ce29a" }}>do</span>.
      </div>

      <div style={S.threatSortRow}>
        <span style={S.tiny}>SORT BY</span>
        <button onClick={() => setSort("actionable")} style={{ ...S.sortBtn, ...(sort === "actionable" ? S.sortBtnOn : {}) }}>most I can do about it</button>
        <button onClick={() => setSort("urgent")} style={{ ...S.sortBtn, ...(sort === "urgent" ? S.sortBtnOn : {}) }}>most urgent</button>
      </div>

      <div style={S.threatGrid}>
        {rows.filter((r) => r.counters.length > 0).map(({ t, counters }) => (
          <div key={t.id} style={S.threatCardV2}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <h3 style={S.threatTitleV2}>{t.label}</h3>
              <span style={{ ...S.metaBadge, color: "#7e8798", borderColor: "#232a36", flexShrink: 0 }}>{t.trajectory}</span>
            </div>

            <div style={{ ...S.counterLabel, marginBottom: 6 }}>↓ WHAT DEFEATS IT · {counters.length} {counters.length === 1 ? "move" : "moves"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 9 }}>
              {counters.map((c) => (
                <button key={c.id} className="pa-chip"
                  style={{ ...S.counterChip, "--dc": DOMAIN[c.domain]?.c || "#5fd3c8" } as CSSProperties}
                  onClick={() => setSelected(c.id)} title={c.summary}>
                  <span style={{ width: 6, height: 6, borderRadius: 6, background: DOMAIN[c.domain]?.c || "#8ce29a", display: "inline-block" }} />
                  {c.label}
                </button>
              ))}
            </div>

            <div style={S.residualV2}>
              <span style={{ color: "#b0846a", fontFamily: mono, fontSize: 10, letterSpacing: 0.5 }}>RESIDUAL · </span>
              {t.residual.length > 165 ? t.residual.slice(0, 163) + "…" : t.residual}
            </div>
            <button style={S.traceBtn} onClick={() => onTrace(t.id)}>trace on the web ↗</button>
          </div>
        ))}
      </div>

      {noDefense.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ ...S.counterLabel, color: "#ff8c6b", marginBottom: 8 }}>NO INDIVIDUAL DEFENSE — collective action only</div>
          <div style={{ ...S.tiny, marginBottom: 10, maxWidth: 640 }}>
            These have no move you can make alone. The honest answer is policy: bans, transparency, litigation. See the "Push back collectively" journey.
          </div>
          <div style={S.threatGrid}>
            {noDefense.map(({ t }) => (
              <div key={t.id} style={{ ...S.threatCardV2, borderLeft: "2px solid #6e3d3d" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <h3 style={S.threatTitleV2}>{t.label}</h3>
                  <span style={{ ...S.metaBadge, color: "#7e8798", borderColor: "#232a36" }}>{t.trajectory}</span>
                </div>
                <div style={S.residualV2}>{t.residual.length > 180 ? t.residual.slice(0, 178) + "…" : t.residual}</div>
                <button style={S.traceBtn} onClick={() => onTrace(t.id)}>trace on the web ↗</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
