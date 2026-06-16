import { S } from "@/lib/styles";

export default function FreshStart() {
  return (
    <div style={S.freshStart}>
      <div style={{ color: "#5fd3c8", fontFamily: "ui-monospace,monospace", fontSize: 14, fontWeight: 700, letterSpacing: 1.5 }}>YOUR MAP STARTS HERE</div>
      <div style={{ color: "#d4dae6", fontSize: 14, lineHeight: 1.6, marginTop: 5 }}>
        No score yet — that&apos;s a starting line, not a judgment. Most people begin with one 20-minute move and feel the first win today. Your progress bar appears with your first completed step.
      </div>
    </div>
  );
}
