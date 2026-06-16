"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- contribution data is loosely typed by design */

/* ---------- ContributePanel: the community-contribution hub ----------
   Shows the review queue (live, from the contribution API), the propose-node form,
   machine-access export, and local contribution stats. The review queue + proposals
   now run on the real backend (POST /api/contribute/{nonce,verify,submit,vote},
   GET /api/contribute/list); the stats line and "your suggested sources" still
   reflect the shared graph storage other tabs write to. MachineAccess is deferred
   to Phase 13 because it requires GRAPH/HOWTOS/HOWTO_VARIANTS/RESOURCES/JOURNEYS
   data that is not yet wired in the web build. */

import { useCallback, useEffect, useState } from "react";
import { S } from "@/lib/styles";
import { DOMAIN, KINDBADGE } from "@/data/ui-maps";
import { connectAndSignIn, shortAddress } from "@/lib/wallet";
import type { ContributionWithStatus } from "@/lib/contribute/types";
import ProposeNode from "@/components/contribute/ProposeNode";
import ContribCard from "@/components/contribute/ContribCard";
import { VoteControl } from "./VoteControl";
import MachineAccess from "@/components/contribute/MachineAccess";

interface ContributePanelProps {
  contributions: any;
  setContributions: (c: any) => void;
  byId: Map<string, any>;
}

export default function ContributePanel({ contributions, setContributions, byId }: ContributePanelProps) {
  const edits = contributions.edits || {};
  const srcs = contributions.sources || {};
  const editCount = Object.keys(edits).length;
  const srcCount = Object.values(srcs).reduce((a: number, b: any) => a + (b as any[]).length, 0);

  // ---- contribution API state ----
  const [items, setItems] = useState<ContributionWithStatus[] | null>(null);
  const [queueError, setQueueError] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState("");

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/contribute/list");
      if (!res.ok) throw new Error("list failed");
      const data = await res.json();
      setItems(data.items as ContributionWithStatus[]);
      setQueueError(false);
    } catch {
      setItems([]);
      setQueueError(true);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time data fetch; setState happens after an async network round-trip, not synchronously
  useEffect(() => { reload(); }, [reload]);

  const signIn = useCallback(async () => {
    setAuthMsg("");
    try {
      const addr = await connectAndSignIn();
      setAddress(addr);
      return addr;
    } catch (e: any) {
      setAuthMsg(e?.message || "Could not connect wallet.");
      return null;
    }
  }, []);

  return (
    <div style={S.contribWrap}>
      <h2 style={{ ...S.detailH, fontSize: 22 }}>This graph is a seed, not an answer.</h2>
      <p style={S.contribP}>
        The privacy landscape changes constantly — tools die, laws shift, new threats emerge. No single author keeps that current.
        <b style={{ color: "#fff" }}> The long-term plan is to make this graph community-owned</b>, with an AI agent sweeping for freshness and dead links,
        and contributors supplying the correctness and nuance that only people close to a problem have.
      </p>
      <div style={S.contribGrid}>
        <ContribCard n="1" title="Evidence-first edits" body="Every proposed change must attach a source. Claims without references stay flagged 'needs verification' — visible to everyone, trusted by no one until corroborated." />
        <ContribCard n="2" title="Review states" body="proposed → verified → disputed → deprecated. Nothing silently becomes truth; the seed data is marked 'verified · seed', community edits carry their own provenance." />
        <ContribCard n="3" title="Agent + crowd" body="The agent does breadth (new tools, link-rot, changed laws). The crowd does depth (does this actually work, here, against this adversary, today)." />
        <ContribCard n="4" title="Versioned & reversible" body="Edits are auditable and can be rolled back. Contributors are attributed. Disputes are surfaced, not hidden." />
      </div>
      <div style={S.contribStats}>
        Your local contributions this session: <b style={{ color: "#5fd3c8" }}>{srcCount} sources</b>, <b style={{ color: "#7fb2ff" }}>{editCount} edits</b>.
        <span style={S.tiny}> (Prototype: stored in shared graph storage to demonstrate the flow. The production model adds auth, moderation queues, and consensus signals.)</span>
      </div>

      {/* wallet sign-in: required to propose or vote */}
      <div style={{ ...S.contribStats, marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {address ? (
          <span style={{ ...S.tiny, color: "#8ce29a" }}>signed in as {shortAddress(address)}</span>
        ) : (
          <>
            <button style={{ ...S.goalBtn, width: "auto", marginTop: 0 }} onClick={signIn}>connect wallet →</button>
            <span style={S.tiny}>Connect a wallet to propose nodes and vote. Sign-in is a signature, never a transaction.</span>
          </>
        )}
        {authMsg && <span style={{ ...S.tiny, color: "#ff8c6b" }}>{authMsg}</span>}
      </div>

      {/* live review queue: pending submissions from the contribution backend */}
      {(() => {
        if (queueError) return (
          <div style={{ ...S.contribStats, marginTop: 14 }}>
            <b style={{ color: "#f0c468" }}>Contribution service unavailable.</b> <span style={S.tiny}>The rest of the atlas is fully usable — only the live review queue and proposals are temporarily offline. Try again shortly.</span>
          </div>
        );
        if (items === null) return (
          <div style={{ ...S.contribStats, marginTop: 14 }}>
            <span style={S.tiny}>Loading the review queue…</span>
          </div>
        );
        const pending = items.filter((it) => it.status !== "rejected");
        if (pending.length === 0) return (
          <div style={{ ...S.contribStats, marginTop: 14 }}>
            <b style={{ color: "#8ce29a" }}>REVIEW QUEUE — empty.</b> <span style={S.tiny}>New submissions land here until reviewers verify they work. Verification is a contribution too.</span>
          </div>
        );
        return (
          <div style={{ marginTop: 18 }}>
            <div style={{ ...S.sectLabel, color: "#f0c468" }}>REVIEW QUEUE · {pending.length} in review — nothing becomes trusted until the community verifies it</div>
            {pending.map((it, i) => {
              const p = it.payload;
              if (!("nodeKind" in p)) return null; // how-to entries are rendered elsewhere, not in the node review card
              const aiVerified = it.badge === "verified";
              return (
                <div key={it.id || i} style={S.pendingCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ ...S.commTag, borderColor: "#4d3a1a", color: "#f0c468" }}>{p.nodeKind === "threat" ? "NEW THREAT proposal" : "NEW MOVE proposal"}</span>
                    <span style={{ color: "#fff", fontSize: 14 }}>{p.label}</span>
                    <span style={S.tiny}>{(p.domain && DOMAIN[p.domain]?.label) || p.domain}</span>
                  </div>
                  <div style={{ ...S.tiny, marginTop: 4, lineHeight: 1.55 }}>
                    {p.summary}
                    {p.honesty && <div style={{ color: "#f0a868", marginTop: 3 }}>{p.nodeKind === "threat" ? "residual: " : "caveat: "}{p.honesty}</div>}
                    {p.src && p.src.url && (
                      <div style={{ marginTop: 3 }}>
                        {/* PHISHING GUARD: claimed source is plain text — becomes a link ONLY after the maintainer verifies the entry (AI badge), never on votes alone */}
                        {aiVerified ? (
                          <>verified source: <a href={p.src.url} target="_blank" rel="noopener noreferrer" style={{ color: "#7fb2ff", wordBreak: "break-all" }}>{p.src.title || p.src.url}</a></>
                        ) : (
                          <>claimed source (verify): <span style={{ wordBreak: "break-all" }}>{p.src.url}</span></>
                        )}
                      </div>
                    )}
                  </div>
                  <VoteControl nodeId={it.id} />
                </div>
              );
            })}
          </div>
        );
      })()}
      <ProposeNode contributions={contributions} setContributions={setContributions} byId={byId} address={address} signIn={signIn} onSubmitted={reload} />

      <MachineAccess />

      {srcCount > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={S.sectLabel}>YOUR SUGGESTED SOURCES</div>
          {Object.entries(srcs).map(([nid, arr]) => (arr as any[]).map((s, i) => (
            <div key={nid + i} style={{ ...S.source, cursor: "default" }}>
              <span style={S.srcKind}>{KINDBADGE[s.kind]}</span>
              <span style={{ flex: 1 }}>{byId.get(nid)?.label}: {s.title}</span>
            </div>
          )))}
        </div>
      )}
    </div>
  );
}
