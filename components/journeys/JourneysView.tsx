"use client";

/* eslint-disable react/no-unescaped-entities -- copy-heavy verbatim port */
/* eslint-disable @typescript-eslint/no-explicit-any -- loose contribution/node data is acceptable */

import { useState, useEffect, useRef } from "react";
import { S, mono } from "@/lib/styles";
import { JOURNEYS } from "@/data/journeys";
import { computePrivacyScore, privacyLabel, countDue } from "@/lib/score";
import type { Model } from "@/lib/types";
import type { Journey } from "@/data/journeys";
import FreshStart from "@/components/common/FreshStart";
import PrivacyBar from "@/components/common/PrivacyBar";
import JourneyStep from "@/components/journeys/JourneyStep";
import BackupModal from "@/components/journeys/BackupModal";

/* ---------- journeyStepNodes helper (ref L359) ---------- */
function journeyStepNodes(j: Journey) {
  const out: { node: string; pair?: string; optional?: boolean; optionalNote?: string; highlight?: string }[] = [];
  j.stages.forEach((st) => st.steps.forEach((s) => out.push(s)));
  return out;
}

/* ---------- JourneysView props ---------- */
export interface JourneysViewProps {
  model: Model;
  onExplore: (id: string | null) => void;
  onInspect: (id: string) => void;
  selected: string | null;
  homeSignal: number;
  /** Opens the shell-level center-stage AI assistant modal (the hero amber CTA). */
  onAskAI?: () => void;
  /** Shared progress state from the shell (single source of truth). Falls back to local state when omitted (e.g. in tests that don't pass it). */
  done?: Record<string, number | boolean>;
  /** Shared updater from the shell — persists to storage and updates the map. Falls back to local storage write when omitted. */
  setDone?: (next: Record<string, number | boolean>) => void;
}

/* ---------- JourneysView (ref L577) ---------- */
export default function JourneysView({ model, onExplore, onInspect, selected, homeSignal, onAskAI, done: doneProp, setDone: setDoneProp }: JourneysViewProps) {
  const { byId } = model;
  const [activeId, setActiveId] = useState<string | null>(null);
  /* local fallback state — only used when the shell does not supply done/setDone (e.g. isolated tests) */
  const [doneLocal, setDoneLocal] = useState<Record<string, number | boolean>>({});
  // eslint-disable-next-line react-hooks/set-state-in-effect -- verbatim port; homeSignal is an external signal (tab re-click), not internal state
  useEffect(() => { setActiveId(null); }, [homeSignal]);   // tab re-click → back to mission list

  /* When running in isolation (no shell prop), load progress from storage into local state */
  useEffect(() => {
    if (doneProp !== undefined) return;  // shell is supplying done — skip local load
    (async () => {
      try {
        const r = await (window as any).storage.get("journeyProgress", false);
        if (r && r.value) setDoneLocal(JSON.parse(r.value));
      } catch {
        // storage unavailable — start with empty progress
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* resolve: prefer shell-supplied prop, fall back to local state */
  const done: Record<string, number | boolean> = doneProp !== undefined ? doneProp : doneLocal;

  const [toast, setToast] = useState<{ label: string; delta: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const toggle = async (nodeId: string) => {
    const next = { ...done };
    const checking = !next[nodeId];
    if (checking) next[nodeId] = Date.now(); else delete next[nodeId];   // timestamped, so it can age
    if (checking) {                                   // the completion MOMENT: show what this step just earned
      const before = computePrivacyScore(model, done).pct;
      const after = computePrivacyScore(model, next).pct;
      const delta = Math.max(0, Math.round((after - before) * 10) / 10);
      const n = model.all.find((x) => x.id === nodeId);
      setToast({ label: n ? n.label : "step", delta });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3800);
    }
    if (setDoneProp) {
      /* shell-managed: updates shared doneMap + persists to storage */
      setDoneProp(next);
    } else {
      /* isolated fallback: update local state + persist directly */
      setDoneLocal(next);
      try { await (window as any).storage.set("journeyProgress", JSON.stringify(next), false); } catch { /* quota/access */ }
    }
  };

  const [backupOpen, setBackupOpen] = useState(false);
  const missionsRef = useRef<HTMLDivElement | null>(null);

  if (!activeId) {
    const score = computePrivacyScore(model, done);
    const lab = privacyLabel(score.pct);
    const sections: string[] = [];
    JOURNEYS.forEach((j) => { if (!sections.includes(j.section)) sections.push(j.section); });
    return (
      <div style={S.journeyWrap}>
        <div style={S.journeyHero}>
          <div style={S.kicker}>START HERE</div>
          <h2 style={{ ...S.detailH, fontSize: 24, marginTop: 6 }}>Pick a mission.</h2>
          <p style={{ color: "#9aa0b5", fontSize: 14, lineHeight: 1.6, maxWidth: 620, marginTop: 6 }}>
            A mission is one goal, reached in a short escalating set of steps — or build a personalized route in MY PATH.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
            <button style={S.aiHeroCta} onClick={() => onAskAI && onAskAI()}>✦ Ask AI · build my plan</button>
            <button style={{ ...S.triageBtn, borderColor: "#313846", color: "#9aa0b5" }} onClick={() => missionsRef.current && missionsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })}>◈ browse the missions</button>
            <button style={{ ...S.triageBtn, borderColor: "#313846", color: "#9aa0b5" }} onClick={() => onExplore(null)}>◇ I know what I'm doing — open the web</button>
          </div>
        </div>

        {Object.values(done).filter(Boolean).length === 0 ? <FreshStart /> : (
          <>
            <PrivacyBar score={score} lab={lab} due={countDue(model, done)} />
            <div style={{ display: "flex", justifyContent: "flex-end", margin: "-16px 0 18px" }}>
              <button style={S.howLink} onClick={() => setBackupOpen(true)}>⛃ back up / restore my journey</button>
            </div>
          </>
        )}
        {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} onRestored={(d: any) => {
          if (d.journeyProgress) {
            if (setDoneProp) { setDoneProp(d.journeyProgress); } else { setDoneLocal(d.journeyProgress); }
          }
        }} />}

        <div ref={missionsRef} />
        {toast && (
          <div style={S.toast}>✓ {toast.label}{toast.delta > 0 ? <span style={{ color: "#8ce29a" }}> · privacy +{toast.delta}%</span> : ""} <span style={{ color: "#969eb0" }}>— nice. it's saved.</span></div>
        )}
        {sections.map((sec) => (
          <div key={sec} style={{ marginBottom: 26 }}>
            <div style={S.sectionLabel}>{sec}</div>
            <div style={S.journeyGrid}>
              {JOURNEYS.filter((j) => j.section === sec).map((j) => {
                const steps = journeyStepNodes(j);
                const total = steps.length;
                const complete = steps.filter((s) => done[s.node]).length;
                const pctc = total ? (complete / total) * 100 : 0;
                const doneAll = complete === total && total > 0;
                return (
                  <button key={j.id} style={{ ...S.journeyCard, borderColor: doneAll ? "#2a4d2a" : "#1d2430" }} onClick={() => setActiveId(j.id)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 26 }}>{j.icon}</div>
                      {doneAll
                        ? <span style={{ ...S.miniTag, color: "#8ce29a", borderColor: "#2a4d2a" }}>complete</span>
                        : sec === "Start here" && <span style={{ ...S.miniTag, color: "#5fd3c8", borderColor: "#2a5d63" }}>⭐ most people start here</span>}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 14, color: "#fff", marginTop: 8 }}>{j.label}</div>
                    <div style={{ fontSize: 12.5, color: "#9aa0b5", lineHeight: 1.5, marginTop: 6 }}>{j.blurb.length > 120 ? j.blurb.slice(0, 118) + "…" : j.blurb}</div>
                    <div style={S.journeyProgress}>
                      <div style={{ ...S.journeyProgressFill, width: pctc + "%" }} />
                    </div>
                    <div style={{ ...S.tiny, marginTop: 6 }}>{complete} / {total} done · {j.stages.length} stages</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const j = JOURNEYS.find((x) => x.id === activeId)!;
  const allSteps = journeyStepNodes(j);
  const complete = allSteps.filter((s) => done[s.node]).length;
  let stepNum = 0;

  return (
    <div style={S.journeyWrap}>
      <button style={S.backLink} onClick={() => setActiveId(null)}>← all missions</button>
      {toast && (
        <div style={S.toast}>✓ {toast.label}{toast.delta > 0 ? <span style={{ color: "#8ce29a" }}> · privacy +{toast.delta}%</span> : ""} <span style={{ color: "#969eb0" }}>— nice. it's saved.</span></div>
      )}
      <div style={S.journeyHero}>
        <div style={{ fontSize: 30 }}>{j.icon}</div>
        <h2 style={{ ...S.detailH, fontSize: 24, marginTop: 4 }}>{j.label}</h2>
        <p style={{ color: "#9aa0b5", fontSize: 14, lineHeight: 1.6, maxWidth: 640, marginTop: 6 }}>{j.blurb}</p>
        <div style={{ ...S.journeyProgress, maxWidth: 320, marginTop: 12 }}>
          <div style={{ ...S.journeyProgressFill, width: (allSteps.length ? (complete / allSteps.length) * 100 : 0) + "%" }} />
        </div>
        <div style={{ ...S.tiny, marginTop: 6 }}>{complete} of {allSteps.length} steps complete</div>
      </div>

      <div style={S.rampLine}>
        {j.stages.map((st) => (
          <div key={st.name} style={{ marginBottom: 22 }}>
            <div style={S.stageHead}>
              <span style={S.stageDot} />
              <div>
                <div style={{ fontFamily: mono, fontSize: 12.5, letterSpacing: 1.4, color: "#fff" }}>{st.name}</div>
                <div style={S.tiny}>{st.note}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 5, borderLeft: "1px solid #1a1f29", paddingLeft: 16 }}>
              {st.steps.map((step) => {
                // eslint-disable-next-line react-hooks/immutability -- verbatim port; stepNum is a render-local counter, not state
                stepNum += 1;
                const n = byId.get(step.node);
                if (!n) return null;
                const pair = step.pair ? byId.get(step.pair) ?? null : null;
                return (
                  <JourneyStep key={step.node} n={n} pair={pair} step={step} num={stepNum}
                    done={done} toggle={toggle} onExplore={onExplore} onInspect={onInspect} selected={selected} />
                );
              })}
            </div>
          </div>
        ))}
        {complete === allSteps.length && allSteps.length > 0 && (
          <div style={S.journeyDone}>
            ✓ You've worked through every step in this mission. Remember privacy isn't "done" — revisit as tools and laws change, and try another mission.
          </div>
        )}
      </div>
    </div>
  );
}
