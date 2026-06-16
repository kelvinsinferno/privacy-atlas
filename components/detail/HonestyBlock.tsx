import { S } from "@/lib/styles";

interface HonestyBlockProps {
  label: string;
  text: string;
  c: string;
}

export default function HonestyBlock({ label, text, c }: HonestyBlockProps) {
  return (
    <div style={{ ...S.honesty, borderLeftColor: c }}>
      <div style={{ ...S.tiny, color: c, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "#d0d6e2" }}>{text}</div>
    </div>
  );
}
