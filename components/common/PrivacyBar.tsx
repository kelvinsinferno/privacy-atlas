import { S, mono } from "@/lib/styles";
import type { PrivacyScore, PrivacyLabel } from "@/lib/score";

interface PrivacyBarProps {
  score: PrivacyScore;
  lab: PrivacyLabel;
  compact?: boolean;
  due: number;
}

export default function PrivacyBar({ score, lab, compact, due }: PrivacyBarProps) {
  const fillPct = (score.pct * 100).toFixed(0);
  return (
    <div style={{ ...S.pbarWrap, ...(compact ? { padding: 12, marginBottom: 14 } : {}) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={S.kicker}>YOUR PRIVACY POSTURE</span>
        <span style={{ fontFamily: mono, fontSize: 12.5, color: lab.c }}>{lab.t}</span>
      </div>
      <div style={S.pbarTrack}>
        <div style={{ ...S.pbarFill, width: fillPct + "%", background: lab.c }} />
        <div style={{ ...S.pbarCeiling }} title="No one is ever fully private — this is the realistic ceiling." />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={S.tiny}>Fully exposed</span>
        <span style={S.tiny}>{score.completed} of {score.total} moves · cap at &quot;hardened&quot;</span>
        <span style={S.tiny}>As private as realistic</span>
      </div>
      {due > 0 && (
        <div style={{ ...S.tiny, marginTop: 8, color: "#7fb2ff" }}>
          ⟲ {due} completed move{due === 1 ? " is" : "s are"} due for a re-check — things like broker removals and freezes don&apos;t stay done on their own.
        </div>
      )}
      {!compact && (
        <div style={{ ...S.tiny, marginTop: 8, color: "#8b94a6", lineHeight: 1.5 }}>
          Weighted by how much each move matters — finishing a hard, deep move moves the needle more than an easy one. The bar never reaches the far end: privacy is reduction of exposure, never invisibility.
        </div>
      )}
    </div>
  );
}
