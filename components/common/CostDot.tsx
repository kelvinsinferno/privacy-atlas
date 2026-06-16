import { S } from "@/lib/styles";
import { COSTC } from "@/data/ui-maps";

interface CostDotProps {
  k: string;
  v: string;
  map: Record<string, string>;
}

export default function CostDot({ k: _k, v, map }: CostDotProps) {
  return <span style={{ ...S.miniTag, color: COSTC[v] || "#9aa0b5", borderColor: "#1d2430" }}>{map[v]}</span>;
}
