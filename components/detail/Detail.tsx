"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- contributions / community source entries
   are loosely-typed crowdsource blobs; node.sources, node.community, node.actionability
   are read from loose JSON data; typed as any to match the prototype. */
/* eslint-disable react/no-unescaped-entities -- panel copy is ported verbatim (apostrophes, ·). */

import { useEffect, useState } from "react";
import { S } from "@/lib/styles";
import { DOMAIN, THREAT_C, COSTC, KINDBADGE, TRAJ, ACTORS } from "@/data/ui-maps";
import type { ModelNode, Model } from "@/lib/types";
import type { MyDevices } from "./DevicesModal";
import HonestyBlock from "./HonestyBlock";
import HowTo from "./HowTo";
import AskGrok from "./AskGrok";
import RegionOverlayView from "./RegionOverlayView";
import type { AISeed } from "@/components/ai/AIModal";
import ReviewBadge from "./ReviewBadge";
import RelGroup from "./RelGroup";
import { nodeJsonLd, safeJsonLdString } from "@/lib/jsonld";
import { VoteControl } from "@/components/contribute/VoteControl";
import { fetchSources, type SourceView } from "@/lib/contribute/vote-state";
import { COMMUNITY_SOURCES } from "@/data/community-content";
import { connectAndSignIn } from "@/lib/wallet";
import { CONTRIBUTOR_TERMS } from "@/lib/contribute/terms";

/* ------------------------------------------------------------------ */
/*  SuggestSource — submits a community reference through the backend  */
/* ------------------------------------------------------------------ */
interface SuggestSourceProps {
  nodeId: string;
  onSubmitted: () => void | Promise<void>;
}
function SuggestSource({ nodeId, onSubmitted }: SuggestSourceProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [sourceKind, setSourceKind] = useState("org");
  const [msg, setMsg] = useState<string | null>(null); // inline submit feedback

  const submit = async () => {
    if (!/^https?:\/\//.test(url) || !title.trim()) return;
    setMsg(null);
    const body = {
      kind: "source",
      targetId: nodeId,
      title: title.trim(),
      url: url.trim(),
      ...(sourceKind ? { sourceKind } : {}),
    };
    try {
      const res = await fetch("/api/contribute/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 401) { try { await connectAndSignIn(); } catch {} setMsg("Connect a wallet to contribute, then submit again."); return; }
      if (res.status === 403) { const { error } = await res.json().catch(() => ({})); setMsg(error || "Your wallet isn't eligible to contribute yet."); return; }
      if (res.status === 400) { const { error } = await res.json().catch(() => ({})); setMsg(error || "Please check the fields."); return; }
      if (!res.ok) { setMsg("Couldn't submit — try again."); return; }
      setTitle(""); setUrl(""); setSourceKind("org"); setOpen(false);
      await onSubmitted();
    } catch { setMsg("Network error — try again."); }
  };

  if (!open) return <button style={S.addSrc} onClick={() => setOpen(true)}>＋ suggest a source</button>;
  return (
    <div style={S.suggestBox}>
      <div style={S.tiny}>Suggest a reference. <b style={{ color: "#f0c468" }}>It enters community review — the link stays unclickable until verified.</b> {CONTRIBUTOR_TERMS}</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title" style={S.input} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" style={S.input} />
      <select value={sourceKind} onChange={(e) => setSourceKind(e.target.value)} style={S.input}>
        {["primary", "docs", "research", "org", "news", "reference"].map((k) => <option key={k}>{k}</option>)}
      </select>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={S.goalBtn} onClick={submit}>submit</button>
        <button style={S.clearBtn} onClick={() => setOpen(false)}>cancel</button>
      </div>
      {msg && <div style={{ ...S.tiny, color: "#f0c468" }}>{msg}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail props                                                        */
/* ------------------------------------------------------------------ */
interface DetailProps {
  node: ModelNode | undefined;
  model: Model;
  setSelected: (id: string | null) => void;
  setGoal: (id: string) => void;
  contributions: any;
  setContributions: (c: any) => void;
  myDevices?: MyDevices;
  saveDevices?: (d: MyDevices) => void;
  /** opens the center-stage AI assistant, optionally seeded with a move/steps context */
  openAI?: (seed: AISeed) => void;
  country?: string;
}

/* ------------------------------------------------------------------ */
/*  Detail panel — verbatim port of reference/PrivacyAtlas.jsx L1703   */
/* ------------------------------------------------------------------ */
export default function Detail({ node, model, setSelected, setGoal, contributions, setContributions, myDevices, saveDevices, openAI, country }: DetailProps) {
  const [fineOpen, setFineOpen] = useState(false);
  const [communitySources, setCommunitySources] = useState<SourceView[]>([]); // live community sources (backend)
  const nodeId = node?.id;

  // live community sources for this node (empty if backend is unavailable → graceful)
  const loadSources = async () => { if (nodeId) setCommunitySources(await fetchSources(nodeId)); };
  useEffect(() => {
    if (!nodeId) return;
    let ok = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async network fetch; setState lands after the round-trip, scoped to [nodeId]
    setCommunitySources([]);
    fetchSources(nodeId).then((s) => { if (ok) setCommunitySources(s); }).catch(() => { if (ok) setCommunitySources([]); });
    return () => { ok = false; };
  }, [nodeId]);

  const { links, byId } = model;
  if (!node) return null;
  const isThreat = node.kind === "threat";
  const col = isThreat ? THREAT_C : (DOMAIN[(node as any).domain]?.c || "#fff");

  const rel = links.filter((l) => ((l.source as any).id || l.source) === node.id || ((l.target as any).id || l.target) === node.id);
  const out = (type: string) => rel.filter((l) => ((l.source as any).id || l.source) === node.id && l.type === type)
    .map((l) => byId.get((l.target as any).id || l.target as string));
  const incoming = (type: string) => rel.filter((l) => ((l.target as any).id || l.target) === node.id && l.type === type)
    .map((l) => byId.get((l.source as any).id || l.source as string));

  const counteredBy = isThreat
    ? rel.filter((l) => l.type === "counters" && ((l.target as any).id || l.target) === node.id).map((l) => byId.get((l.source as any).id || l.source as string))
    : [];
  const countersThreats = !isThreat
    ? rel.filter((l) => l.type === "counters" && ((l.source as any).id || l.source) === node.id).map((l) => byId.get((l.target as any).id || l.target as string))
    : [];

  // Built-in citations from node.sources (static, verified seeds) are also DB
  // contributions seeded with ids "src:<nodeId>:<i>". They render below from the
  // static list, so drop them from the live community list to avoid duplicates.
  // Tier 2 — the community-static layer: VERIFIED community sources baked into the
  // build (regenerated by the bake script). Render as verified cards.
  const bakedSources = COMMUNITY_SOURCES[node.id] || [];
  const bakedIds = new Set(bakedSources.map((s) => s.id));
  // Drop the seed citations (rendered above) AND any baked id (rendered just below)
  // from the live list, so nothing double-renders.
  const liveCommunitySources = communitySources.filter((s) => !s.id.startsWith("src:" + node.id + ":") && !bakedIds.has(s.id));
  const builtInSources = (node as any).sources || [];

  return (
    <div style={S.detail}>
      {/* JSON-LD structured data — per-node open knowledge (schema.org).
          dangerouslySetInnerHTML is acceptable here: content is SERVER-CONTROLLED
          graph data (nodeJsonLd), NOT user input. safeJsonLdString() escapes
          < > & so </script> injection is impossible even with future community data. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdString(nodeJsonLd(node)) }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ width: 11, height: 11, background: col, borderRadius: isThreat ? 0 : 11, transform: isThreat ? "rotate(45deg)" : "none", display: "inline-block" }} />
        <span style={S.kicker}>{isThreat ? "THREAT" : DOMAIN[(node as any).domain]?.label?.toUpperCase()} · TIER {node.tier}{(node as any).actionability === "trap" ? " · ⚠ TRAP" : ""}</span>
        <button onClick={() => setSelected(null)} style={S.closeBtn} aria-label="close" title="close (or click empty space)">✕</button>
      </div>
      <h2 style={S.detailH}>{node.label}</h2>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 12px" }}>
        <ReviewBadge node={node} contributions={contributions} />
        <VoteControl nodeId={node.id} />
        {isThreat && (node as any).trajectory && (
          <span style={{ ...S.metaBadge, color: TRAJ[(node as any).trajectory], borderColor: TRAJ[(node as any).trajectory] }}>{(node as any).trajectory} ▲</span>
        )}
        {(node as any).ceiling && <span style={S.metaBadge}>ceiling: {(node as any).ceiling}</span>}
        {(node as any).community && <span style={{ ...S.metaBadge, color: "#5fd3c8", borderColor: "#2a5d63" }}>community-proposed · verified</span>}
        {(node as any).actionability === "awareness" && <span style={{ ...S.metaBadge, color: "#f0c468", borderColor: "#f0c468" }}>awareness-only</span>}
      </div>

      <p style={S.summary}>{(node as any).summary}</p>

      {/* For a THREAT, lead with the solution — what defeats it — before the residual honesty. */}
      {isThreat && counteredBy.length > 0 && (
        <div style={S.counteredByLead}>
          <div style={{ ...S.counterLabel, marginBottom: 7 }}>↓ WHAT DEFEATS IT · {counteredBy.length} {counteredBy.length === 1 ? "move" : "moves"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {counteredBy.map((c) => c && (
              <button key={c.id} style={{ ...S.counterChip, borderColor: DOMAIN[(c as any).domain]?.c || "#2a4d2a" }} onClick={() => setSelected(c.id)} title={(c as any).summary}>
                <span style={{ width: 6, height: 6, borderRadius: 6, background: DOMAIN[(c as any).domain]?.c || "#8ce29a", display: "inline-block" }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {isThreat && counteredBy.length === 0 && (
        <div style={{ ...S.counteredByLead, borderLeftColor: "#ff5c5c" }}>
          <div style={{ ...S.counterLabel, color: "#ff8c6b" }}>NO INDIVIDUAL DEFENSE</div>
          <div style={{ ...S.tiny, marginTop: 4 }}>This one has no move you can make alone — the answer is collective. See the "Push back collectively" journey.</div>
        </div>
      )}

      {/* threats keep residual honesty up front; for MOVES the fine print sits one tap below the how-to */}
      {isThreat && (node as any).residual && <HonestyBlock label="RESIDUAL RISK — what even these moves don't fully solve" text={(node as any).residual} c="#ff5c5c" />}

      {/* cost / actors */}
      {(node as any).cost && (
        <div style={S.costRow}>
          {["money", "friction", "maintenance"].map((k) => (
            <div key={k} style={S.costCell}>
              <div style={S.tiny}>{k}</div>
              <div style={{ color: COSTC[(node as any).cost[k]] || "#d4dae6", fontWeight: 600, fontSize: 14 }}>{(node as any).cost[k]}</div>
            </div>
          ))}
        </div>
      )}
      {/* HOW TO — the action, first. Community-maintained, since how-tos churn constantly */}
      {!isThreat && (
        <HowTo node={node} contributions={contributions} setContributions={setContributions} myDevices={myDevices} saveDevices={saveDevices} openAI={openAI} />
      )}

      {/* ASK AI — live in-site Q&A for device-specific follow-ups the static how-to can't cover */}
      {!isThreat && <AskGrok node={node} openAI={openAI} />}
      {/* IN YOUR REGION — per-country overlay or an honest "written for the US" banner */}
      <RegionOverlayView node={node} country={country} />

      {/* THE FINE PRINT — honesty never deleted, just one deliberate tap below the action */}
      {!isThreat && ((node as any).caveat || (node as any).failureMode || (node as any).residual) && (
        <div style={{ margin: "14px 0 6px" }}>
          <button style={S.fineToggle} onClick={() => setFineOpen(!fineOpen)}>
            {fineOpen ? "▾" : "▸"} THE FINE PRINT · caveats, failure modes & limits — read before relying on this move
          </button>
          {fineOpen && (
            <div style={{ marginTop: 6 }}>
              {(node as any).caveat && <HonestyBlock label="CAVEAT" text={(node as any).caveat} c="#f0a868" />}
              {(node as any).failureMode && <HonestyBlock label="HOW IT FAILS" text={(node as any).failureMode} c="#ff8c6b" />}
              {(node as any).residual && <HonestyBlock label="RESIDUAL RISK — what no defense fully solves" text={(node as any).residual} c="#ff5c5c" />}
            </div>
          )}
        </div>
      )}

      {(node as any).actors && (node as any).actors.length > 0 && (
        <div style={{ margin: "10px 0" }}>
          <div style={S.sectLabel}>DEFENDS AGAINST</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(node as any).actors.map((a: string) => <span key={a} style={S.actorTag}>{ACTORS[a]?.label || a}</span>)}
          </div>
        </div>
      )}

      {/* relations */}
      {isThreat
        ? null
        : <>
            <RelGroup title="COUNTERS THREATS" items={countersThreats} onClick={setSelected} c={THREAT_C} />
            <RelGroup title="REQUIRES FIRST (prerequisites)" items={incoming("prereq")} onClick={setSelected} c="#9aa0b5" />
            <RelGroup title="UNLOCKS" items={out("prereq")} onClick={setSelected} c="#9aa0b5" />
            <RelGroup title="ENABLED / SYNERGIZES WITH" items={out("enables")} onClick={setSelected} c="#5fd3c8" />
            <RelGroup title="TENSION WITH" items={out("tension").concat(incoming("tension"))} onClick={setSelected} c="#f0a868" />
            <RelGroup title="REVEALS" items={out("reveals")} onClick={setSelected} c="#d98ad9" />
          </>}

      {!isThreat && (
        <button style={S.goalBtn} onClick={() => setGoal(node.id)}>◎ trace the path to reach this →</button>
      )}

      {/* SOURCES — the click-through references */}
      <div style={{ marginTop: 16 }}>
        <div style={S.sectLabel}>REFERENCES · verify & self-research</div>
        {builtInSources.length === 0 && bakedSources.length === 0 && liveCommunitySources.length === 0 && <div style={S.tiny}>No sources yet — flagged for community verification.</div>}
        {/* built-in citations: verified seeds → clickable + their own VoteControl (they're
            seeded as "src:<nodeId>:<i>" contributions, so they're votable too). */}
        {builtInSources.map((s: any, i: number) => (
          <div key={s.id ?? s.url ?? i} style={{ ...S.source, display: "block" }}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#d4dae6" }}>
              <span style={S.srcKind}>{KINDBADGE[s.kind] || "REF"}</span>
              <span style={{ flex: 1 }}>{s.title}</span>
              <span style={{ opacity: 0.4 }}>↗</span>
              {s.community && <span style={S.commTag}>community</span>}
            </a>
            {s.url && <div style={{ marginTop: 6 }}><VoteControl nodeId={"src:" + node.id + ":" + i} /></div>}
          </div>
        ))}
        {/* community-static layer (tier 2): VERIFIED community sources baked into the
            build. Verified → the URL is a clickable link, each carries a VoteControl. */}
        {bakedSources.map((s, i) => (
          <div key={s.id || "baked-" + i} style={{ ...S.source, display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ color: "#d4dae6", fontSize: 12.5 }}>{s.title}</span>
              <span style={{ ...S.commTag, borderColor: "#2a4d2a", color: "#8ce29a" }}>community ✓ verified</span>
            </div>
            <div style={{ ...S.tiny, marginTop: 3 }}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#5fd3c8", wordBreak: "break-all" }}>{s.url} ↗</a>
            </div>
            <div style={{ marginTop: 6 }}><VoteControl nodeId={s.id} /></div>
          </div>
        ))}
        {/* live community sources from the backend — each carries its own VoteControl.
            PHISHING GUARD: a submitted URL is clickable ONLY once verified; otherwise
            it's shown as PLAIN TEXT, never a clickable <a href>. */}
        {liveCommunitySources.map((s, i) => {
          const verified = s.badge === "verified";
          return (
            <div key={s.id || i} style={{ ...S.source, display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ color: "#d4dae6", fontSize: 12.5 }}>{s.payload.title}</span>
                <span style={{ ...S.commTag, borderColor: verified ? "#2a4d2a" : "#313846", color: verified ? "#8ce29a" : "#9aa0b5" }}>{verified ? "community ✓ verified" : "⏳ in review"}</span>
              </div>
              <div style={{ ...S.tiny, marginTop: 3 }}>
                {verified
                  ? <a href={s.payload.url} target="_blank" rel="noopener noreferrer" style={{ color: "#5fd3c8", wordBreak: "break-all" }}>{s.payload.url} ↗</a>
                  : <>URL (not linked until verified): <span style={{ color: "#9aa0b5", wordBreak: "break-all" }}>{s.payload.url}</span></>}
              </div>
              <div style={{ marginTop: 6 }}><VoteControl nodeId={s.id} /></div>
            </div>
          );
        })}
        <SuggestSource nodeId={node.id} onSubmitted={loadSources} />
      </div>
    </div>
  );
}
