import { S } from "@/lib/styles";

interface LocalOnlyProps {
  compact?: boolean;
}

export default function LocalOnly({ compact }: LocalOnlyProps) {
  return (
    <div style={{ ...S.localOnly, ...(compact ? { padding: "4px 0 0", border: "none", background: "none", margin: "2px 0 6px" } : {}) }}>
      <span style={{ color: "#8ce29a", flexShrink: 0 }}>🔒</span>
      <span>
        {compact
          ? "Used only to filter what you see. Stored privately on your side — never sent to anyone."
          : "Your answers are used ONLY to filter and tailor what this app shows you. They're stored privately for you alone — never sent to a server, never shared with other users or with us, never used for anything else. Clear them anytime."}
      </span>
    </div>
  );
}
