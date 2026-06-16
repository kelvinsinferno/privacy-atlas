"use client";

/* eslint-disable react/no-unescaped-entities -- verbatim port; copy contains apostrophes and curly quotes */
/* eslint-disable @typescript-eslint/no-explicit-any -- contribution data is loosely typed by design */

/* ---------- propose a NEW node: the graph is a seed, and this is how it grows ----------
   Anyone can propose a new move or threat. Proposals carry the same honesty obligations as
   seed nodes (a caveat / residual is REQUIRED, not optional), enter the same hidden-threshold
   review pipeline, and — once verified — merge into the LIVE map as community nodes.
   Submissions go to POST /api/contribute/submit; the parent re-fetches the review queue. */

import { useState } from "react";
import { S } from "@/lib/styles";
import { DOMAIN } from "@/data/ui-maps";
import type { ProposedNodePayload } from "@/lib/contribute/types";

interface ProposeNodeProps {
  contributions: any;
  setContributions: (c: any) => void;
  byId: Map<string, { label: string; [key: string]: any }>;
  address: string | null;
  signIn: () => Promise<string | null>;
  onSubmitted: () => void | Promise<void>;
}

export default function ProposeNode({ contributions, setContributions, byId, address, signIn, onSubmitted }: ProposeNodeProps) {
  const [kind, setKind] = useState("move");
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState("digital");
  const [summary, setSummary] = useState("");
  const [honesty, setHonesty] = useState("");
  const [rel, setRel] = useState("");
  const [srcUrl, setSrcUrl] = useState("");
  const [srcTitle, setSrcTitle] = useState("");
  const [gapOpen, setGapOpen] = useState(false);
  const [gapName, setGapName] = useState("");
  const [msg, setMsg] = useState("");
  // proposals filed this session (the backend is the source of truth; this is just a local trail)
  const [mine, setMine] = useState<string[]>([]);

  const gaps: any[] = contributions.domainGaps || [];

  const submit = async () => {
    if (label.trim().length < 4) return setMsg("give it a clear name (4+ chars).");
    if (summary.trim().length < 40) return setMsg("the summary is the pitch — at least a sentence or two (40+ chars).");
    if (honesty.trim().length < 20) return setMsg(
      kind === "threat"
        ? "every threat needs its residual: what does it still get past? (20+ chars)"
        : "every move needs its caveat: where does it fall short or fail? Honesty fields are required here, not optional. (20+ chars)"
    );
    if (!/^https?:\/\/.+\..+/.test(srcUrl.trim())) return setMsg("a verifiable source URL is required — claims without sources don't enter the graph.");

    // ensure signed in before submitting
    let addr = address;
    if (!addr) {
      setMsg("connecting wallet — approve the signature to submit…");
      addr = await signIn();
      if (!addr) return setMsg("connect a wallet to submit — sign-in is a signature, never a transaction.");
    }

    const relIds = rel.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)
      .map((name) => {
        for (const [id, n] of byId) {
          if (n.label.toLowerCase() === name || id === name) return id;
        }
        return null;
      })
      .filter(Boolean) as string[];

    const payload: ProposedNodePayload = {
      nodeKind: kind === "threat" ? "threat" : "move",
      label: label.trim(),
      domain,
      summary: summary.trim(),
      honesty: honesty.trim(),
      rel: relIds,
      src: { url: srcUrl.trim(), title: srcTitle.trim() },
    };

    try {
      const res = await fetch("/api/contribute/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { await signIn(); return setMsg("session expired — reconnect and try again."); }
      if (res.status === 403) {
        const { error } = await res.json().catch(() => ({ error: "not eligible" }));
        return setMsg(error || "your wallet isn't eligible to contribute yet.");
      }
      if (res.status === 400) {
        const { error } = await res.json().catch(() => ({ error: "validation failed" }));
        return setMsg(error || "validation failed.");
      }
      if (!res.ok) return setMsg("submission failed — try again shortly.");
    } catch {
      return setMsg("contribution service unavailable — try again shortly.");
    }

    // domain-gap signal still rides along in shared storage (community-pointing tally)
    if (gapOpen && gapName.trim().length >= 3) {
      const next: any = { ...contributions, domainGaps: [...gaps, { name: gapName.trim().toLowerCase(), withNode: label.trim(), ts: Date.now() }] };
      setContributions(next);
      try { await (window as any).storage.set("contributions", JSON.stringify(next), true); } catch {}
    }

    setMine((m) => [...m, label.trim()]);
    setLabel(""); setSummary(""); setHonesty(""); setRel(""); setSrcUrl(""); setSrcTitle("");
    setGapOpen(false); setGapName("");
    setMsg("✓ submitted. It's now in the review queue above — once the community verifies it, it appears on the live map.");
    await onSubmitted();
  };

  return (
    <div style={{ ...S.contribStats, marginTop: 18, borderLeft: "2px solid #5fd3c8" }}>
      <div style={{ ...S.sectLabel, color: "#5fd3c8", marginTop: 0 }}>PROPOSE A NEW NODE · grow the graph itself</div>
      <div style={{ ...S.tiny, lineHeight: 1.55, marginBottom: 10 }}>
        This graph is a seed — the privacy landscape will outgrow it, and you're how it keeps up. Propose a new <b style={{ color: "#d4dae6" }}>move</b> (a defense people can take) or a new <b style={{ color: "#d4dae6" }}>threat</b>. Same rules as everything here: honesty fields and a verifiable source are <b style={{ color: "#f0a868" }}>required</b>, and nothing reaches the map until the community verifies it.
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...S.input, width: "auto", marginBottom: 0 }}>
          <option value="move">new MOVE (a solution)</option>
          <option value="threat">new THREAT</option>
        </select>
        <select value={domain} onChange={(e) => setDomain(e.target.value)} style={{ ...S.input, width: "auto", marginBottom: 0 }}>
          {Object.entries(DOMAIN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label style={{ display: "flex", gap: 6, alignItems: "center", ...S.tiny, cursor: "pointer" }}>
          <input type="checkbox" checked={gapOpen} onChange={(e) => setGapOpen(e.target.checked)} />
          none of these really fit
        </label>
      </div>
      {gapOpen && (
        <div style={{ marginBottom: 8 }}>
          <input value={gapName} onChange={(e) => setGapName(e.target.value)} placeholder="What would you call the missing domain? (e.g. 'neuro / brain-interface')" style={{ ...S.input, marginBottom: 4 }} />
          <div style={{ ...S.tiny, lineHeight: 1.5 }}>
            Domains are the map's skeleton, so new ones aren't created by form — they're created when enough proposals point at the same gap. Your node still files under the closest fit above; this signal rides along, and the tally below builds the case.
          </div>
        </div>
      )}
      <input value={label} onChange={(e) => setLabel(e.target.value)}
        placeholder={kind === "threat" ? "Threat name — e.g. 'Smart-TV ambient listening'" : "Move name, verb-first — e.g. 'Mute your smart TV's microphone'"}
        style={S.input} />
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
        placeholder="Summary: what is it, why it matters, solutions-forward tone."
        style={{ ...S.input, resize: "vertical" }} />
      <textarea value={honesty} onChange={(e) => setHonesty(e.target.value)} rows={2}
        placeholder={kind === "threat" ? "REQUIRED — residual risk: what does this threat still get past, even with defenses?" : "REQUIRED — caveat / how it fails: where does this move fall short?"}
        style={{ ...S.input, resize: "vertical", borderColor: "#3a2a1a" }} />
      <input value={rel} onChange={(e) => setRel(e.target.value)}
        placeholder={kind === "threat" ? "What existing moves counter it? (exact names, comma-separated — optional)" : "What existing threats does it counter? (exact names, comma-separated — optional)"}
        style={S.input} />
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <input value={srcTitle} onChange={(e) => setSrcTitle(e.target.value)} placeholder="Source title" style={{ ...S.input, flex: 1, minWidth: 140 }} />
        <input value={srcUrl} onChange={(e) => setSrcUrl(e.target.value)} placeholder="Source URL (required)" style={{ ...S.input, flex: 2, minWidth: 200 }} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button style={{ ...S.goalBtn, width: "auto" }} onClick={submit}>propose it →</button>
        {msg && <span style={{ ...S.tiny, color: msg.startsWith("✓") ? "#8ce29a" : "#ff8c6b" }}>{msg}</span>}
      </div>
      {mine.length > 0 && (
        <div style={{ ...S.tiny, marginTop: 10 }}>
          Proposals so far: {mine.map((l) => l + " (in review)").join(" · ")}
        </div>
      )}
      {gaps.length > 0 && (() => {
        const tally: Record<string, number> = {};
        gaps.forEach((g: any) => { tally[g.name] = (tally[g.name] || 0) + 1; });
        const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
        return (
          <div style={{ ...S.tiny, marginTop: 8, lineHeight: 1.55 }}>
            <span style={{ color: "#7fb2ff" }}>DOMAIN GAPS the community is pointing at:</span>{" "}
            {sorted.map(([n, c]) => "“" + n + "” \xd7" + c).join(" · ")}
            <span style={{ color: "#969eb0" }}>{" "}— when one of these accumulates real weight, adding the domain becomes a deliberate (human + schema) decision, like biometric and civic once were.</span>
          </div>
        );
      })()}
    </div>
  );
}
