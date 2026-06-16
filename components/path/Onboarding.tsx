"use client";

import { useState } from "react";

import { WORRY } from "@/data/ui-maps";
import { S } from "@/lib/styles";
import LocalOnly from "@/components/common/LocalOnly";
import CountrySelect from "@/components/common/CountrySelect";

interface OnboardingProps {
  onDone: (profile: {
    worry: string;
    actors: string[];
    friction: string;
    level: string;
    domains: null;
    phoneAge: string;
    country: string | null;
    created: number;
  }) => void;
  onSkip: () => void;
}

type OnbStep = {
  q: string; sub: string; val: string | null; set: (v: string) => void;
  opts?: { k: string; label: string; note?: string }[];
  select?: boolean; optional?: boolean;
};

export default function Onboarding({ onDone, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [worry, setWorry] = useState<string | null>(null);
  const [friction, setFriction] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [phoneAge, setPhoneAge] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);

  const steps: OnbStep[] = [
    {
      q: "Who are you most worried about?",
      sub: "This decides which threats weigh heaviest in your path. You can change it later.",
      opts: Object.entries(WORRY).map(([k, v]) => ({ k, label: v.label })),
      val: worry, set: setWorry,
    },
    {
      q: "How much effort can you sustain?",
      sub: "Privacy is mostly upkeep, not purchases. We'll hide moves that cost more daily friction than this.",
      opts: [
        { k: "low", label: "Just the essentials", note: "low-friction moves only" },
        { k: "med", label: "A solid setup", note: "moderate effort welcome" },
        { k: "high", label: "I'll go deep", note: "show me everything, including the hard stuff" },
      ],
      val: friction, set: setFriction,
    },
    {
      q: "Where are you starting from?",
      sub: "Be honest — it just changes where your path begins.",
      opts: [
        { k: "beginner", label: "Total beginner", note: "start me at the foundations" },
        { k: "some", label: "I've done the basics", note: "passwords, 2FA, maybe a VPN" },
        { k: "advanced", label: "I'm fairly advanced", note: "skip the foundations, get to the real moves" },
      ],
      val: level, set: setLevel,
    },
    {
      q: "How old is your main phone?",
      sub: "Old phones stop getting security updates — the #1 thing that blocks exploits. This tunes your path; you can change it later.",
      opts: [
        { k: "lt2", label: "Under 2 years", note: "fully supported" },
        { k: "2to4", label: "2–4 years", note: "usually still patched" },
        { k: "4plus", label: "4+ years", note: "may be past security updates" },
        { k: "unknown", label: "Not sure", note: "we'll flag it to check" },
      ],
      val: phoneAge, set: setPhoneAge,
    },
    {
      q: "Where are you?",
      sub: "Optional. Lets us flag US-specific moves and surface your country's version as the community adds it. You can set or change this anytime.",
      select: true, optional: true,
      val: country, set: setCountry,
    },
  ];
  const cur = steps[step]!;
  const canNext = !!cur.optional || cur.val != null;
  const finish = () => onDone({
    worry: worry!,
    actors: WORRY[worry!].actors,
    friction: friction!,
    level: level!,
    domains: null,
    phoneAge: phoneAge!,
    country: country,
    created: Date.now(),
  });

  return (
    <div style={S.modalWrap}>
      <div style={S.modal}>
        <div style={S.modalHead}>
          <span style={S.kicker}>BUILD MY PATH · STEP {step + 1}/{steps.length}</span>
          <button style={S.skip} onClick={onSkip}>skip → just explore the map</button>
        </div>
        <div style={S.progress}><div style={{ ...S.progressFill, width: `${((step + 1) / steps.length) * 100}%` }} /></div>

        <h2 style={S.modalQ}>{cur.q}</h2>
        <p style={S.modalSub}>{cur.sub}</p>
        <LocalOnly />

        <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "18px 0" }}>
          {/* select-type steps (country) render a dropdown; all others render their radio opts */}
          {cur.select ? (
            <CountrySelect value={cur.val ?? ""} onChange={cur.set} placeholder="🌐 select your country (optional)" />
          ) : (cur.opts ?? []).map((o) => (
            <button key={o.k} onClick={() => cur.set(o.k)}
              style={{ ...S.optBtn, ...(cur.val === o.k ? S.optBtnActive : {}) }}>
              <span style={{ width: 13, height: 13, borderRadius: 13, border: `2px solid ${cur.val === o.k ? "#5fd3c8" : "#3a4250"}`, background: cur.val === o.k ? "#5fd3c8" : "transparent", flexShrink: 0 }} />
              <span style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }}>
                <span style={{ color: "#fff", fontSize: 14 }}>{o.label}</span>
                {"note" in o && o.note && <span style={S.tiny}>{o.note}</span>}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button style={S.clearBtn} disabled={step === 0} onClick={() => setStep((s) => s - 1)}
            >{step === 0 ? "" : "← back"}</button>
          {step < steps.length - 1
            ? <button style={{ ...S.goalBtn, width: "auto", opacity: canNext ? 1 : 0.4 }} disabled={!canNext} onClick={() => setStep((s) => s + 1)}>next →</button>
            : <button style={{ ...S.goalBtn, width: "auto", opacity: canNext ? 1 : 0.4 }} disabled={!canNext} onClick={finish}>◎ build my path</button>}
        </div>
        <div style={{ ...S.tiny, marginTop: 12, color: "#7e8798" }}>You can change this anytime. Asking the AI assistant to “build my plan” later replaces these answers — it’s one shared profile.</div>
      </div>
    </div>
  );
}
