"use client";
import type { SearchEntry } from "@/lib/search";
import { S, mono } from "@/lib/styles";
import EntrySwatch from "@/components/common/EntrySwatch";

/** Mobile list-first view of moves/threats. Each row taps through via onPick
 *  (same handler as the left-rail search). Reuses EntrySwatch for the dot/diamond. */
export default function MobileEntryList({ entries, onPick }: { entries: SearchEntry[]; onPick: (e: SearchEntry) => void }) {
  if (entries.length === 0) {
    return <div style={{ ...S.tiny, padding: 24, textAlign: "center" }}>No moves or threats match your filters.</div>;
  }
  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "4px 10px 90px" }}>
      {entries.map((e) => (
        <button key={e.key} onClick={() => onPick(e)}
          style={{ ...S.searchHit, padding: "12px 8px", minHeight: 44, borderBottom: "1px solid #11151c", gap: 9 }}>
          <EntrySwatch entry={e} size={9} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{e.label}</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: "#7e8798", flexShrink: 0, whiteSpace: "nowrap" }}>{e.sub}</span>
        </button>
      ))}
    </div>
  );
}
