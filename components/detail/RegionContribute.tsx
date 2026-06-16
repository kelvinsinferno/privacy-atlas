"use client";
import { useState } from "react";
import { S } from "@/lib/styles";
import { COUNTRY_BY_CODE } from "@/data/countries";
import { connectAndSignIn } from "@/lib/wallet";
import { CONTRIBUTOR_TERMS } from "@/lib/contribute/terms";

interface RegionContributeProps {
  nodeId: string;
  country: string;
  onSubmitted: () => void | Promise<void>;
  onCancel?: () => void;
}

/** Submit a per-country overlay. Enters community review (held until verified). */
export default function RegionContribute({ nodeId, country, onSubmitted, onCancel }: RegionContributeProps) {
  const [status, setStatus] = useState<"applies" | "different" | "not-applicable">("different");
  const [note, setNote] = useState("");
  const [steps, setSteps] = useState("");
  const [lawName, setLawName] = useState("");
  const [lawRef, setLawRef] = useState("");
  const [src, setSrc] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const c = COUNTRY_BY_CODE[country];

  const submit = async () => {
    const lines = steps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!note.trim() && !lines.length) { setMsg("Add a note or at least one step for your country."); return; }
    setMsg(null);
    const body = {
      kind: "region", targetId: nodeId, country, status,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(lines.length ? { steps: lines } : {}),
      ...(lawName.trim() ? { law: { name: lawName.trim(), ...(lawRef.trim() ? { ref: lawRef.trim() } : {}) } } : {}),
      ...(src.trim() ? { src: { url: src.trim() } } : {}),
    };
    try {
      const res = await fetch("/api/contribute/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 401) { try { await connectAndSignIn(); } catch {} setMsg("Connect a wallet to contribute, then submit again."); return; }
      if (res.status === 403) { const { error } = await res.json().catch(() => ({})); setMsg(error || "Your wallet isn't eligible to contribute yet."); return; }
      if (res.status === 400) { const { error } = await res.json().catch(() => ({})); setMsg(error || "Please check the fields."); return; }
      if (!res.ok) { setMsg("Couldn't submit — try again."); return; }
      setNote(""); setSteps(""); setLawName(""); setLawRef(""); setSrc("");
      await onSubmitted();
    } catch { setMsg("Network error — try again."); }
  };

  return (
    <div style={S.suggestBox}>
      <div style={S.tiny}>Add info for <b style={{ color: "#8fbcff" }}>{c?.flag} {c?.name}</b>. <b style={{ color: "#f0c468" }}>Enters community review and stays hidden until verified.</b> {CONTRIBUTOR_TERMS}</div>
      <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={S.input}>
        <option value="different">Works differently here</option>
        <option value="applies">Works the same here</option>
        <option value="not-applicable">Doesn&apos;t apply here</option>
      </select>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="how this move works in your country (the equivalent, what's different)" style={{ ...S.input, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} />
      <textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={"steps — one step per line (optional)"} style={{ ...S.input, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} />
      <input value={lawName} onChange={(e) => setLawName(e.target.value)} placeholder="local law / regulation name (optional)" style={S.input} />
      <input value={lawRef} onChange={(e) => setLawRef(e.target.value)} placeholder="law reference, e.g. § / article (optional)" style={S.input} />
      <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="source URL (https://…, optional)" style={S.input} />
      <div style={{ display: "flex", gap: 6 }}>
        <button style={S.goalBtn} onClick={submit}>submit</button>
        {onCancel && <button style={S.clearBtn} onClick={onCancel}>cancel</button>}
      </div>
      {msg && <div style={{ ...S.tiny, color: "#f0c468" }}>{msg}</div>}
    </div>
  );
}
