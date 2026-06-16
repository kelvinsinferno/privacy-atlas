"use client";
import { useEffect, useState } from "react";
import { S } from "@/lib/styles";
import { COUNTRY_BY_CODE } from "@/data/countries";
import { COMMUNITY_REGIONS } from "@/data/community-content";
import { fetchRegions, type RegionView } from "@/lib/contribute/vote-state";
import { VoteControl } from "@/components/contribute/VoteControl";
import type { ModelNode, Node, RegionOverlay } from "@/lib/types";
import RegionContribute from "./RegionContribute";

interface RegionOverlayViewProps {
  node: ModelNode;
  country?: string;
}

function isNode(n: ModelNode): n is Node & { kind: "node" | "threat" } {
  return n.kind === "node";
}

const STATUS_LABEL: Record<RegionOverlay["status"], string> = {
  "applies": "applies here",
  "different": "different in your country",
  "not-applicable": "doesn't apply here",
};

/** One overlay's body (note/steps/law + a status chip). Shared by seed + community cards. */
function OverlayBody({ status, note, steps, law }: { status: RegionOverlay["status"]; note?: string; steps?: string[]; law?: { name: string; ref?: string } }) {
  return (
    <>
      {note && <p style={{ ...S.summary, marginTop: 8 }}>{note}</p>}
      {steps && steps.length > 0 && <ol style={S.howtoSteps}>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
      {law && <div style={{ ...S.tiny, marginTop: 6 }}>Law: <b style={{ color: "#d4dae6" }}>{law.name}</b>{law.ref ? ` (${law.ref})` : ""}</div>}
      <span style={{ ...S.commTag, borderColor: "#27406b", color: "#8fbcff", marginTop: 6, display: "inline-block" }}>{STATUS_LABEL[status]}</span>
    </>
  );
}

/** Per-country overlay: seed (trusted) + baked + live community cards, or an honest banner. */
export default function RegionOverlayView({ node, country }: RegionOverlayViewProps) {
  const [live, setLive] = useState<RegionView[]>([]);
  const [adding, setAdding] = useState(false);
  const nodeId = node.id;
  // one form at a time — the banner (no overlay) and the section (has overlay) are
  // mutually exclusive branches, so a single `adding` bit is safe.
  const closeAndRefresh = async () => { setAdding(false); setLive(await fetchRegions(nodeId)); };
  useEffect(() => {
    let ok = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async network fetch, scoped to [nodeId]
    setLive([]);
    fetchRegions(nodeId).then((r) => { if (ok) setLive(r); }).catch(() => { if (ok) setLive([]); });
    return () => { ok = false; };
  }, [nodeId]);

  if (!country || country === "US") return null;
  const c = COUNTRY_BY_CODE[country];
  if (!c) return null;

  const seed: RegionOverlay | undefined = isNode(node) ? node.regions?.[country] : undefined;
  const baked = (COMMUNITY_REGIONS[nodeId] || []).filter((r) => r.country === country);
  const bakedIds = new Set(baked.map((r) => r.id));
  const liveForCountry = live.filter((r) => r.payload.country === country && !bakedIds.has(r.id) && r.id !== ("reg:" + nodeId));

  const hasAny = !!seed || baked.length > 0 || liveForCountry.length > 0;

  if (!hasAny) {
    if (isNode(node) && node.regionScope === "localized") {
      return (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...S.aiLeakWarn, borderColor: "#27406b", color: "#8fbcff" }} role="note">
            ⚠ This move is <b>written for the US</b> — not yet localized for {c.flag} {c.name}. The general principle still applies.{" "}
            <button onClick={() => setAdding(true)} style={{ background: "none", border: "none", color: "#5fd3c8", cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}>add steps for {c.name} →</button>
          </div>
          {adding && <div style={{ marginTop: 8 }}><RegionContribute nodeId={nodeId} country={country} onSubmitted={closeAndRefresh} onCancel={() => setAdding(false)} /></div>}
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ ...S.sectLabel, color: "#8fbcff", margin: 0 }}>IN YOUR REGION · {c.flag} {c.name}</div>

      {seed && (
        <div style={{ ...S.howtoCard, borderLeftColor: "#27406b" }}>
          <OverlayBody status={seed.status} note={seed.note} steps={seed.steps} law={seed.law} />
          {seed.sources && seed.sources.length > 0 && (
            <div style={{ ...S.tiny, marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
              {seed.sources.map((src, i) => <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: "#5fd3c8", wordBreak: "break-all" }}>{src.title} ↗</a>)}
            </div>
          )}
        </div>
      )}

      {baked.map((r) => (
        <div key={r.id} style={S.howtoCard}>
          <div style={S.howtoHead}><span style={{ ...S.commTag, borderColor: "#2a4d2a", color: "#8ce29a" }}>community ✓ verified</span></div>
          <OverlayBody status={r.status} note={r.note} steps={r.steps} law={r.law} />
          {r.src?.url && <div style={{ ...S.tiny, marginTop: 4 }}><a href={r.src.url} target="_blank" rel="noopener noreferrer" style={{ color: "#5fd3c8", wordBreak: "break-all" }}>{r.src.title || "source"} ↗</a></div>}
          <div style={{ marginTop: 6 }}><VoteControl nodeId={r.id} /></div>
        </div>
      ))}

      {liveForCountry.map((r) => {
        const verified = r.badge === "verified";
        const url = r.payload.src?.url;
        return (
          <div key={r.id} style={S.howtoCard}>
            <div style={S.howtoHead}><span style={{ ...S.commTag, borderColor: verified ? "#2a4d2a" : "#313846", color: verified ? "#8ce29a" : "#9aa0b5" }}>{verified ? "community ✓ verified" : "⏳ in review"}</span></div>
            <OverlayBody status={r.payload.status} note={r.payload.note} steps={r.payload.steps} law={r.payload.law} />
            {url && (
              <div style={{ ...S.tiny, marginTop: 4, wordBreak: "break-all" }}>
                {verified
                  ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#5fd3c8", wordBreak: "break-all" }}>{r.payload.src?.title || "source"} ↗</a>
                  : <>claimed source (verify): <span style={{ color: "#9aa0b5", wordBreak: "break-all" }}>{url}</span></>}
              </div>
            )}
            <div style={{ marginTop: 6 }}><VoteControl nodeId={r.id} /></div>
          </div>
        );
      })}
      {!adding
        ? <button style={{ ...S.addSrc, marginTop: 8 }} onClick={() => setAdding(true)}>＋ add info for {c.flag} {c.name}</button>
        : <div style={{ marginTop: 8 }}><RegionContribute nodeId={nodeId} country={country} onSubmitted={closeAndRefresh} onCancel={() => setAdding(false)} /></div>}
    </div>
  );
}
