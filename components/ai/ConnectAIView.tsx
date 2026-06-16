"use client";

import { useState } from "react";
import { S, mono } from "@/lib/styles";

// Production MCP endpoint — placeholder until the server is deployed (see docs/DEPLOY-MCP.md). Replace with the real https URL after deploy.
export const MCP_URL = "https://mcp.privacyatlas.xyz/mcp";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 9, marginBottom: 6 }}>
      <span style={{ fontFamily: mono, fontSize: 12, color: "#f5b878", flexShrink: 0 }}>{n}</span>
      <span style={{ fontSize: 12.5, color: "#aab0be", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function Client({ name, note, steps }: { name: string; note: string; steps: string[] }) {
  return (
    <div style={{ borderTop: "1px solid #1a130b", padding: "12px 0 4px" }}>
      <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#f5b878" }}>{name}<span style={{ color: "#7e8798", fontWeight: 400, fontSize: 12 }}> · {note}</span></div>
      <div style={{ marginTop: 7 }}>{steps.map((st, i) => <Step key={i} n={i + 1}>{st}</Step>)}</div>
    </div>
  );
}

export default function ConnectAIView({ onBack }: { onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div>
      <button onClick={onBack} style={{ ...S.warnTeaser, color: "#969eb0", marginBottom: 8 }}>‹ back to the assistant</button>
      <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, letterSpacing: 0.5, color: "#f5b878" }}>✦ Connect your own AI</div>
      <div style={{ fontSize: 13, color: "#aab0be", lineHeight: 1.6, marginTop: 6 }}>
        The most private option: connect <b style={{ color: "#d4dae6" }}>your own</b> AI to Privacy Atlas over MCP. Your assistant queries the whole atlas live — every move, threat, and path — using <b style={{ color: "#d4dae6" }}>your tokens</b>, with the conversation never touching our servers. Own your context; let any AI read it.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", background: "#0a0d12", border: "1px solid #1f2530", borderRadius: 7, padding: "9px 11px" }}>
        <code style={{ fontFamily: mono, fontSize: 12, color: "#8fe8de", flex: 1, wordBreak: "break-all" }}>{MCP_URL}</code>
        <button onClick={copy} style={{ ...S.aiBtn, padding: "6px 12px" }}>{copied ? "copied ✓" : "copy"}</button>
      </div>
      <Client name="Claude" note="Pro / Max / Team / Enterprise" steps={["Settings → Connectors → Add custom connector.", "Paste the URL above, click Add, and authorize. (One-click OAuth — no config files.)", "Enable it per-chat from the + menu, then ask it to plan your privacy."]} />
      <Client name="ChatGPT" note="Developer Mode required for individuals" steps={["Turn on Settings → Connectors → Developer Mode (beta).", "Add a connector with the URL above and authorize.", "Note: ChatGPT is pickier about auth headers than other clients."]} />
      <Client name="Grok" note="paid account" steps={["Go to grok.com → Connectors (grok.com/manage-connectors).", "Add a remote MCP server with the HTTPS URL above.", "Scope it Individual (private) and connect."]} />
      <Client name="Perplexity, Cursor, VS Code, others" note="any MCP client" steps={["Add a custom/remote MCP connector and paste the URL above.", "Same protocol everywhere — only the menu location differs."]} />
      <div style={{ ...S.tiny, marginTop: 12, lineHeight: 1.55 }}>
        No account needed with us. Nothing about your usage is logged here — your AI talks to the public knowledge base, not to a profile of you. As clients add reviewed connector directories, this becomes one-click; today it&apos;s a paste-the-URL step inside your AI.
      </div>
    </div>
  );
}
