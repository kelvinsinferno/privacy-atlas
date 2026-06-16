import { S } from "@/lib/styles";
import { EDGE, DOMAIN, DOMAIN_LETTER } from "@/data/ui-maps";

export default function Legend() {
  return (
    <div>
      <div style={S.ctrlLabel}>DOMAINS</div>
      {Object.entries(DOMAIN).map(([k, v]) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 7, margin: "3px 0" }}>
          <span style={{ width: 14, height: 14, background: v.c, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, fontWeight: 700, color: "#070809", lineHeight: 1 }}>
              {DOMAIN_LETTER[k]}
            </span>
          </span>
          <span style={{ ...S.tiny, color: "#aab0be" }}>{v.label}</span>
        </div>
      ))}
      <div style={{ ...S.ctrlLabel, marginTop: 10 }}>EDGE TYPES</div>
      {Object.entries(EDGE).map(([k, v]) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 7, margin: "3px 0" }}>
          <svg width={26} height={6}><line x1={0} y1={3} x2={26} y2={3} stroke={v.c} strokeWidth={v.w + 0.5} strokeDasharray={v.dash} /></svg>
          <span style={{ ...S.tiny, color: "#aab0be" }}>{v.label}</span>
        </div>
      ))}
      <div style={{ ...S.tiny, marginTop: 8, color: "#8b94a6" }}>● circle = privacy move ◆ diamond = threat · dot = needs verification</div>
    </div>
  );
}
