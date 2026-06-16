import { S } from "@/lib/styles";
import { DOMAIN, THREAT_C } from "@/data/ui-maps";
import type { ModelNode } from "@/lib/types";

interface RelGroupProps {
  title: string;
  items: (ModelNode | undefined)[];
  onClick: (id: string) => void;
  c: string;
}

export default function RelGroup({ title, items, onClick, c }: RelGroupProps) {
  const seen = new Set<string>(); const uniq = items.filter((x): x is ModelNode => !!x && !seen.has(x.id) && !!seen.add(x.id));
  if (uniq.length === 0) return null;
  return (
    <div style={{ margin: "9px 0" }}>
      <div style={{ ...S.sectLabel, color: c }}>{title}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {uniq.map((x) => (
          <button key={x.id} onClick={() => onClick(x.id)} style={{ ...S.relPill, borderColor: x.kind === "threat" ? THREAT_C : (DOMAIN[(x as { domain?: string }).domain || ""]?.c || "#444") }}>
            {x.label}
          </button>
        ))}
      </div>
    </div>
  );
}
