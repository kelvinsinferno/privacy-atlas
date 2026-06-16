"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- verbatim port of the prototype's
   loosely-typed community entries (howto/resource submissions carry ad-hoc shapes). */

/* ---------- community verification: submissions are PENDING until peers confirm ----------
   Anyone can submit; nothing becomes "the answer" until reviewed. Consensus rules
   are defined in lib/community.ts (single source of truth — see entryStatus() there):
     verified = confirms >= promote-bar AND confirms >= flags * 3 (strong consensus)
     rejected = flags >= reject-bar AND flags >= confirms (disputes fail closed)
     promote-bar: 9–16 (per-entry, derived from id); reject-bar: 5–8 (per-entry)
   Bars are deliberately variable and undisclosed; users only ever see "in review".
   otherwise pending (shown only in review expanders, clearly marked unverified).
   One vote per person per entry (best-effort: personal storage; production needs real identity). */

import { useState, useEffect } from "react";
import { S } from "@/lib/styles";
export { entryStatus, newEntryId } from "@/lib/community";

/* ---------- staleness signal: one tap to report a how-to that no longer matches reality ----------
   These reports feed two consumers: human contributors (visible count) and the future AI
   maintainer agent, which will prioritize re-verification by exactly this signal. */
interface OutdatedFlagProps {
  nodeId: string;
  contributions: any;
  setContributions: (c: any) => void;
}
export function OutdatedFlag({ nodeId, contributions, setContributions }: OutdatedFlagProps) {
  const reports = ((contributions.outdated || {})[nodeId] || []);
  const [mine, setMine] = useState<boolean | null | undefined>(undefined);
  useEffect(() => {
    let ok = true;
    (async () => { try { const r = await window.storage.get("outdated:" + nodeId, false); if (ok) setMine(r && r.value ? true : null); } catch { if (ok) setMine(null); } })();
    return () => { ok = false; };
  }, [nodeId]);
  const report = async () => {
    if (mine) return;
    setMine(true);
    try { await window.storage.set("outdated:" + nodeId, "1", false); } catch {}
    const next = { ...contributions, outdated: { ...(contributions.outdated || {}) } };
    next.outdated[nodeId] = [...reports, Date.now()];
    setContributions(next);
    try { await window.storage.set("contributions", JSON.stringify(next), true); } catch {}
  };
  return (
    <button onClick={report} disabled={!!mine}
      aria-label="flag this move as outdated for re-verification"
      title="paths moved? setting renamed? tool dead? flag it for re-verification"
      style={{ ...S.commTag, borderColor: "#313846", color: mine ? "#9aa0b5" : "#969eb0", cursor: mine ? "default" : "pointer", background: "none" }}>
      {mine ? "✓ flagged for re-check" : "⚑ outdated?"}{reports.length > 0 ? " · " + reports.length : ""}
    </button>
  );
}
