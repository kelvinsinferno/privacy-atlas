"use client";

import type { SearchEntry } from "@/lib/search";
import { mono } from "@/lib/styles";

/**
 * EntrySwatch — shared presentational component.
 *
 * Renders the coloured circle / diamond / kind-glyph that precedes each
 * result row in the CommandK palette AND the left-rail inline search.
 *
 * - move / resource entries: filled circle (swatch colour)
 * - threat entries:          filled diamond (swatch colour, rotated)
 * - mission / look / section entries: small kind-specific glyph
 *
 * @param size  Diameter of the circle/diamond in px (default 8).
 */
export default function EntrySwatch({ entry, size = 8 }: { entry: SearchEntry; size?: number }) {
  if (entry.swatch && entry.letter) {
    const d = Math.max(size, 13);
    return (
      <span
        style={{
          width: d,
          height: d,
          background: entry.swatch,
          borderRadius: d,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: "#070809", lineHeight: 1 }}>
          {entry.letter}
        </span>
      </span>
    );
  }
  if (entry.swatch) {
    /* threat (diamond) or domainless swatch — current behaviour */
    return (
      <span
        style={{
          width: size,
          height: size,
          background: entry.swatch,
          borderRadius: entry.diamond ? 0 : size,
          transform: entry.diamond ? "rotate(45deg)" : "none",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
    );
  }
  /* No swatch — show a small kind glyph */
  const glyph =
    entry.kind === "mission" ? "◈"
    : entry.kind === "look" ? "✦"
    : "→"; /* section */
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: 10.5,
        color: "#5fd3c8",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  );
}
