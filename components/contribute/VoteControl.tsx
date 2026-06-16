"use client";
import { useEffect, useState } from "react";
import { S } from "@/lib/styles";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { fetchNodeVoteState, castNodeVote, type NodeVoteState } from "@/lib/contribute/vote-state";

/** Outline thumb icon (stroke = currentColor; fills in once the user has voted). */
function Thumb({ dir, active }: { dir: "up" | "down"; active: boolean }) {
  const up = "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3";
  const down = "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17";
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={dir === "up" ? up : down} />
    </svg>
  );
}

/** Public thumbs-up/down + net score for any node. Score shows to everyone;
 *  casting a vote prompts wallet sign-in. One-shot (no retract). */
export function VoteControl({ nodeId }: { nodeId: string }) {
  const [st, setSt] = useState<NodeVoteState | null | undefined>(undefined); // undefined=loading, null=unavailable
  const [mine, setMine] = useState<"confirm" | "flag" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let ok = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per-node UI state (vote/message) when nodeId changes; intentional, runs only on the [nodeId] transition
    setMine(null); setMsg(null);
    fetchNodeVoteState(nodeId).then((s) => { if (ok) setSt(s); }).catch(() => { if (ok) setSt(null); });
    return () => { ok = false; };
  }, [nodeId]);

  if (st === undefined || st === null) return null; // loading or backend unavailable → no control (graceful)

  const vote = async (kind: "confirm" | "flag") => {
    if (mine) return;
    setMsg(null);
    const r = await castNodeVote(nodeId, kind);
    if (r.ok) {
      setMine(kind);
      setSt((p) => p ? { ...p, confirms: p.confirms + (kind === "confirm" ? 1 : 0), flags: p.flags + (kind === "flag" ? 1 : 0), score: p.score + (kind === "confirm" ? 1 : -1) } : p);
    } else if (r.reason === "signin") setMsg("Connect a wallet to vote.");
    else setMsg(r.reason || "Couldn't record your vote.");
  };

  const btn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #2a3340", borderRadius: 6, cursor: active ? "default" : "pointer", lineHeight: 0, ...(isMobile ? { padding: "9px 13px", minHeight: 40 } : { padding: "3px 7px" }) });
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <button aria-label="this works (thumbs up)" disabled={mine === "confirm"} onClick={() => vote("confirm")} style={{ ...btn(mine === "confirm"), color: "#8ce29a" }}><Thumb dir="up" active={mine === "confirm"} /></button>
        <span style={{ ...S.tiny, color: "#d4dae6", minWidth: 18, textAlign: "center", fontVariantNumeric: "tabular-nums" }} title="net community score (confirms − flags)">{st.score}</span>
        <button aria-label="this is stale or wrong (thumbs down)" disabled={mine === "flag"} onClick={() => vote("flag")} style={{ ...btn(mine === "flag"), color: "#ff5c5c" }}><Thumb dir="down" active={mine === "flag"} /></button>
      </span>
      {st.badge === "verified" && <span style={{ ...S.commTag, borderColor: "#2a4d2a", color: "#8ce29a" }} title="verified by the Atlas maintainer">✓ verified</span>}
      {st.stale && <span style={{ ...S.commTag, borderColor: "#4d3a1a", color: "#f0c468" }} title="enough downvotes to flag for re-review">⚑ possibly stale</span>}
      {msg && <span style={{ ...S.tiny, color: "#f0c468" }}>{msg}</span>}
    </span>
  );
}
