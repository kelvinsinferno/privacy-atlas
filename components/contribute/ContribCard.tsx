import { S } from "@/lib/styles";

interface ContribCardProps {
  n: string | number;
  title: string;
  body: string;
}

export default function ContribCard({ n, title, body }: ContribCardProps) {
  return (
    <div style={S.ccard}>
      <div style={{ color: "#5fd3c8", fontFamily: "ui-monospace,monospace", fontSize: 12.5 }}>0{n}</div>
      <div style={{ fontWeight: 600, margin: "4px 0 6px", color: "#fff" }}>{title}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "#aab0be" }}>{body}</div>
    </div>
  );
}
