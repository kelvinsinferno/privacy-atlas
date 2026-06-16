"use client";

/* eslint-disable react/no-unescaped-entities -- verbatim port of copy-heavy modal */

import { useState, useEffect } from "react";
import { S } from "@/lib/styles";
import { exportBackup, importBackup, type BackupPayload } from "@/lib/backup";

interface BackupModalProps {
  onClose: () => void;
  onRestored: (data: BackupPayload) => void;
}

/* ---------- BackupModal (ref L787) — local-first backup / restore ----------
   Local-first means YOU are the database. Export gives you a plain-text snapshot of your journey
   (progress + timestamps, profile, devices) to keep wherever you trust; import restores it on any
   device. No server, no account, nothing for anyone to aggregate or sell. */
export default function BackupModal({ onClose, onRestored }: BackupModalProps) {
  const [text, setText] = useState("loading your data…");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const out: Record<string, unknown> = {};
      for (const k of ["journeyProgress", "profile", "devices"]) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = await (window as any).storage.get(k, false);
          if (r && r.value) out[k] = JSON.parse(r.value);
        } catch {
          // storage unavailable — skip key
        }
      }
      setText(exportBackup({
        journeyProgress: (out.journeyProgress ?? {}) as Record<string, unknown>,
        profile: (out.profile ?? {}) as Record<string, unknown>,
        devices: (out.devices ?? {}) as Record<string, unknown>,
      }));
    })();
  }, []);

  const doImport = async () => {
    let restored;
    try {
      restored = importBackup(text);
    } catch {
      setMsg("couldn't parse that — paste the exact backup text you exported.");
      return;
    }
    for (const k of ["journeyProgress", "profile", "devices"] as const) {
      if (restored[k] !== undefined) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (window as any).storage.set(k, JSON.stringify(restored[k]), false);
        } catch {
          // quota exceeded / access denied — skip
        }
      }
    }
    if (onRestored) onRestored(restored);
    setMsg("✓ restored. Your progress, score, and devices are back.");
  };

  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={{ ...S.modal, width: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <span style={S.kicker}>BACK UP / RESTORE MY JOURNEY</span>
          <button style={S.skip} onClick={onClose}>close</button>
        </div>
        <p style={{ ...S.modalSub, marginTop: 0 }}>
          Your journey lives on <b style={{ color: "#fff" }}>your side only</b> — there's no account and no server copy, which also means we can't recover it for you. To keep it across devices or years: <b style={{ color: "#fff" }}>copy this text somewhere you trust</b> (password manager note, encrypted drive). To restore on another device: paste a backup here and import.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{ ...S.input, minHeight: 170, resize: "vertical", fontFamily: "ui-monospace,monospace", fontSize: 10.5, lineHeight: 1.45 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button
            style={S.goalBtn}
            onClick={() => {
              try {
                if (navigator.clipboard) navigator.clipboard.writeText(text);
                setMsg("✓ copied — now store it somewhere safe.");
              } catch {
                setMsg("select the text and copy manually.");
              }
            }}
          >copy backup</button>
          <button style={{ ...S.goalBtn, borderColor: "#4d3a1a", color: "#f0c468", background: "#15110d" }} onClick={doImport}>import what's pasted above</button>
          {msg && <span style={{ ...S.tiny, color: msg.startsWith("✓") ? "#8ce29a" : "#ff8c6b" }}>{msg}</span>}
        </div>
        <div style={{ ...S.localOnly, marginTop: 12 }}>
          <span style={{ color: "#8ce29a", flexShrink: 0 }}>🔒</span>
          <span>This backup is plain text in YOUR hands — it never touches a server. Treat it as sensitive: it describes your defenses. Storing it in your password manager keeps it both safe and encrypted.</span>
        </div>
      </div>
    </div>
  );
}
