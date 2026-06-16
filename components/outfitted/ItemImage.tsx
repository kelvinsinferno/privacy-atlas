"use client";

import { S } from "@/lib/styles";
import { DOMAIN } from "@/data/ui-maps";
import { KIT_ICONS } from "@/data/personas";
import type { ModelNode } from "@/lib/types";

interface ItemImageProps {
  node: ModelNode & { image?: string };
  accent?: string;
  h?: number;
}

export default function ItemImage({ node, accent, h }: ItemImageProps) {
  const c = accent || (DOMAIN[node.domain] && DOMAIN[node.domain].c) || "#5fd3c8";
  const art = KIT_ICONS[node.id];
  return (
    <div style={{ ...S.itemImg, height: h || 120 }}>
      {node.image
        // eslint-disable-next-line @next/next/no-img-element -- verbatim photo-slot port; real photos drop in per-item with no layout change
        ? <img src={node.image} alt={node.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (art ? art(c) : <div style={{ ...S.itemImgFallback, color: c }}>{(DOMAIN[node.domain] && DOMAIN[node.domain].label) || "ITEM"}</div>)}
    </div>
  );
}
