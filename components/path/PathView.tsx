"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- window.storage bridge is loose by design. */

import { useState, useEffect } from "react";

import { WORRY, DOMAIN } from "@/data/ui-maps";
import { S, mono } from "@/lib/styles";
import { computePrivacyScore, privacyLabel, countDue } from "@/lib/score";
import PrivacyBar from "@/components/common/PrivacyBar";
import FreshStart from "@/components/common/FreshStart";
import PathItem from "@/components/path/PathItem";
import { phoneStatus, type PathEntry, type PathProfile } from "@/lib/path";
import type { Model } from "@/lib/types";

interface AiPath {
  moves: string[]; // node IDs (resolved by handleAIPath in the shell)
  reason?: string;
  ts: number;
}

interface PathViewProps {
  path: PathEntry[];
  profile: PathProfile | null;
  setSelected: (id: string) => void;
  model: Model;
  onExplore: (id: string | null) => void;
  onStart: () => void;
  aiPath: AiPath | null;
  onClearAIPath: () => void;
  /** Shared progress state from the shell (single source of truth). Falls back to local state when omitted (e.g. isolated tests). */
  done?: Record<string, number | boolean>;
}

export default function PathView({ path, profile, setSelected, onExplore, onStart, model, aiPath, onClearAIPath, done: doneProp }: PathViewProps) {
  const [doneLocal, setDoneLocal] = useState<Record<string, number | boolean>>({});
  /* When running in isolation (no shell prop), load progress from storage into local state */
  useEffect(() => {
    if (doneProp !== undefined) return;  // shell is supplying done — skip local load
    (async () => {
      try { const r = await (window as any).storage.get("journeyProgress", false); if (r && r.value) setDoneLocal(JSON.parse(r.value)); } catch {}
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* resolve: prefer shell-supplied prop, fall back to local state */
  const done: Record<string, number | boolean> = doneProp !== undefined ? doneProp : doneLocal;

  const [deviceBannerDismissed, setDeviceBannerDismissed] = useState(false);
  const phoneRiskStatus = phoneStatus(profile || {});
  const showDeviceBanner =
    !deviceBannerDismissed &&
    (phoneRiskStatus === "atrisk" || phoneRiskStatus === "uncertain") &&
    model?.byId?.has?.("update-discipline");

  if (!profile) {
    return (
      <div style={S.pathEmpty}>
        <div style={{ fontSize: 44, opacity: 0.3 }}>◎</div>
        <h2 style={{ ...S.detailH, fontSize: 24, marginTop: 10 }}>Privacy is a path, not a pile of warnings.</h2>
        <p style={{ maxWidth: 460, lineHeight: 1.65, color: "#aab0be", marginTop: 8 }}>
          Tell us what you&apos;re worried about and how far you want to go, and we&apos;ll lay out a personalized sequence —
          ordered so each step builds on the last, weighted toward the threats growing fastest, and honest about what each one costs.
        </p>
        <button style={{ ...S.goalBtn, width: "auto", marginTop: 18, padding: "11px 22px" }} onClick={onStart}>◎ build my path →</button>
      </div>
    );
  }

  // group the sequence into 3 phases
  const n = path.length;
  const phases = [
    { name: "START HERE", note: "Foundations & quick wins — do these first; later moves build on them.", items: path.slice(0, Math.min(6, n)) },
    { name: "HIGH-IMPACT NEXT", note: "Your biggest risk reduction for the effort, given who you're worried about.", items: path.slice(6, Math.min(16, n)) },
    { name: "GOING DEEPER", note: "Advanced and situational moves. Optional, but here when you want them.", items: path.slice(16) },
  ].filter((p) => p.items.length);

  const worryLabel = profile.worry ? WORRY[profile.worry]?.label : undefined;
  const score = model ? computePrivacyScore(model, done) : null;
  const lab = score ? privacyLabel(score.pct) : null;
  const nextStep = path.find((it) => !done[it.node.id]);

  return (
    <div style={S.pathWrap}>
      <div style={S.pathHero}>
        <div style={S.kicker}>YOUR PATH · tuned for &quot;{worryLabel}&quot; · {profile.friction}-effort · {profile.level}</div>
        <h2 style={{ ...S.detailH, fontSize: 24, marginTop: 6 }}>{path.length} moves, in the order that makes sense for you.</h2>
        <p style={{ color: "#9aa0b5", fontSize: 14, lineHeight: 1.6, maxWidth: 640, marginTop: 6 }}>
          Sequenced so prerequisites come first, ranked by leverage and by how fast each threat is growing, and penalized by cost — so cheap, high-impact moves rise to the top. Each step is a <b style={{ color: "#5fd3c8" }}>solution</b>: what you do, and what it stops.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={S.tiny}>Your path = every relevant move in one order built for you. Prefer themed quests instead? ◈ JOURNEYS has missions — both feed the same progress.</div>
        <span style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onExplore(null)} style={{ ...S.tiny, background: "none", border: "none", color: "#5fd3c8", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>◇ see it painted on the web →</button>
          <button onClick={onStart} style={{ ...S.tiny, background: "none", border: "none", color: "#969eb0", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>↻ redo setup</button>
        </span>
      </div>
      {score && (Object.values(done).filter(Boolean).length === 0 ? <FreshStart /> : <PrivacyBar score={score} lab={lab!} due={model ? countDue(model, done) : 0} />)}

      {showDeviceBanner && (
        <div role="status" style={{ ...S.aiLeakWarn, borderColor: "#4d3a1a", color: "#f0c468", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
          <div>
            {phoneRiskStatus === "atrisk"
              ? <>⚠ A phone 4+ years old may no longer get security updates — and staying patched is the #1 thing that stops exploits. </>
              : <>Not sure how old your phone is? If it&apos;s more than ~4 years old it may have stopped getting security updates. </>}
            <button onClick={() => setSelected("update-discipline")} style={{ background: "none", border: "none", color: "#5fd3c8", cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}>Keep everything updated →</button>
          </div>
          <button onClick={() => setDeviceBannerDismissed(true)} aria-label="dismiss" style={{ background: "none", border: "none", color: "#969eb0", cursor: "pointer", padding: 0, flexShrink: 0 }}>✕</button>
        </div>
      )}

      {aiPath && aiPath.moves && aiPath.moves.length > 0 && (() => {
        const nmap = new Map((model ? model.all : []).map((n) => [n.id, n]));
        return (
          <div style={{ ...S.aiPanel, borderLeft: "2px solid #5fd3c8", marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <div style={{ ...S.sectLabel, color: "#5fd3c8", margin: 0 }}>✦ AI-BUILT CUSTOM PATH · from your interview</div>
              <button style={{ ...S.tiny, background: "none", border: "none", color: "#969eb0", cursor: "pointer", padding: 0 }} onClick={onClearAIPath}>✕ clear</button>
            </div>
            {aiPath.reason && <div style={{ fontSize: 12.5, color: "#9aa0b5", lineHeight: 1.5, margin: "6px 0 4px" }}>{aiPath.reason}</div>}
            <div style={{ marginTop: 8 }}>
              {aiPath.moves.map((id, i) => {
                const node = nmap.get(id);
                if (!node) return null;
                const isDone = !!done[id];
                return (
                  <div key={id} onClick={() => setSelected(id)}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", borderRadius: 5, cursor: "pointer", background: i % 2 ? "transparent" : "#10141b" }}>
                    <span style={{ color: "#5fd3c8", fontFamily: "ui-monospace,monospace", fontSize: 11, width: 18, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ width: 7, height: 7, borderRadius: 7, background: DOMAIN[node.domain]?.c || "#fff", flexShrink: 0 }} />
                    <span style={{ color: isDone ? "#969eb0" : "#e4e8f0", fontSize: 14, textDecoration: isDone ? "line-through" : "none", flex: 1 }}>{node.label}</span>
                    {isDone && <span style={{ ...S.tiny, color: "#8ce29a" }}>done ✓</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ ...S.tiny, marginTop: 8 }}>Click any step for its how-to. Check steps off in their journey or here as you go — the computed path below stays available as the full picture.</div>
          </div>
        );
      })()}

      {nextStep && (
        <div style={S.whereNext} onClick={() => onExplore(nextStep.node.id)}>
          <div style={S.tiny}>WHERE YOU ARE · {score!.completed} of {score!.total} moves done</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: 10 }}>
            <span style={{ color: "#fff", fontSize: 14 }}>Next recommended step: <b>{nextStep.node.label}</b></span>
            <span style={{ color: "#5fd3c8", fontFamily: mono, fontSize: 11, whiteSpace: "nowrap" }}>open →</span>
          </div>
        </div>
      )}

      {phases.map((ph, pi) => (
        <div key={ph.name} style={{ marginBottom: 26 }}>
          <div style={S.phaseHead}>
            <span style={S.phaseNum}>{String(pi + 1).padStart(2, "0")}</span>
            <div>
              <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: 1.5, color: "#fff" }}>{ph.name}</div>
              <div style={S.tiny}>{ph.note}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ph.items.map((it, i) => (
              <PathItem key={it.node.id} item={it} idx={pi === 0 ? i + 1 : null} onExplore={onExplore} />
            ))}
          </div>
        </div>
      ))}

      <div style={S.pathFoot}>
        This path is generated from the seed graph and your answers — not gospel. As the graph grows through community contributions, your path sharpens with it.
        <button style={{ ...S.clearBtn, marginLeft: 10 }} onClick={onStart}>↻ retune</button>
      </div>
    </div>
  );
}
