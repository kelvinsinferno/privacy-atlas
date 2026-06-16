"use client";

/* ---------- AIModal ----------
   The center-stage assistant. Replaces the old buried, below-the-fold inline
   panel: a labeled launcher (AILauncher) and the welcome/Journeys doorways all
   open THIS one modal. It leads with concrete TASKS (the 3 starters) rather than
   an empty box.

   It REUSES EmbeddedAIChat (streaming, /api/ai, progress-consent checkbox, the
   "build this as my path" card) untouched — this file is just the center-stage
   shell + the honest leak-tradeoff teaser ported from the old AskAIPanel. */

import { useState, useEffect } from "react";
import { S } from "@/lib/styles";
import EmbeddedAIChat from "@/components/ai/EmbeddedAIChat";
import ConnectAIView from "./ConnectAIView";
import type { Model } from "@/lib/types";
import type { AIPath } from "@/lib/ai-context";

const STARTERS = [
  { label: "◈ Pick my first move", prompt: "I'm new here. Interview me one question at a time about my situation (who I'm most worried about, my devices, how much effort I can sustain), then recommend the single first move I should make and why." },
  { label: "◎ Find my weakest spots", prompt: "Act as a privacy consultant. Ask me a few questions one at a time across digital, economic, physical, and biometric exposure, then give an honest read of my three weakest surfaces and the first move to fix each." },
  { label: "⟳ Re-check my progress", prompt: "I've been working on my privacy for a while. Ask me what's changed, verify my riskiest protections are still in effect, and recommend my next 3 moves." },
];

/** A seed lets a specific surface (a how-to card, a move's "ask AI") open THIS modal
 *  pre-loaded with that context: nodeId topic-locks the server prompt, `starters`
 *  replaces the default task starters with the surface's own (e.g. "help me with these
 *  exact steps"), and `sensitive` surfaces the stronger keep-it-generic warning. */
export interface AISeed {
  nodeId?: string;
  starters?: { label: string; prompt: string }[];
  sensitive?: boolean;
  /** the move's label — shown in the header ("Help with: …") so a seeded open
   *  visibly reads as a help session for that specific how-to. */
  title?: string;
}

interface AIModalProps extends AISeed {
  open: boolean;
  onClose: () => void;
  model?: Model;
  done?: Record<string, number | boolean>;
  onInspect?: (id: string) => void;
  onBuildPath?: (path: AIPath) => void;
  deviceContext?: string;
  regionContext?: string;
}

export default function AIModal({ open, onClose, model, done, onInspect, onBuildPath, nodeId, starters, sensitive, title, deviceContext, regionContext }: AIModalProps) {
  // A seeded open (from a how-to card / a move's "ask AI") carries its own starters
  // and auto-engages the context; the bare launcher open uses the default task starters.
  const seeded = !!(starters && starters.length);
  const [warnOpen, setWarnOpen] = useState(false);
  const [view, setView] = useState<"chat" | "connect">("chat");

  // Esc closes while open; listener cleaned up on close/unmount.
  // Note: view resets to "chat" automatically on each open because the component
  // unmounts (returns null) when open=false and remounts fresh when open becomes true.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,8,11,.72)",
        backdropFilter: "blur(4px)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Atlas AI assistant"
        style={S.aiModal}
        onClick={(e) => e.stopPropagation()}
      >
        {view === "connect" ? (
          <ConnectAIView onBack={() => setView("chat")} />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ color: "#f5b878", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 17, fontWeight: 700 }}>
                  {seeded && title ? `✦ Help with: ${title}` : "✦ Atlas assistant"}
                </div>
                <div style={{ ...S.tiny, marginTop: 5, lineHeight: 1.55, color: "#9aa0b5" }}>
                  {seeded
                    ? "The assistant already has this move and its steps — it'll ask which step you're stuck on. Reply below."
                    : "Tell it your situation; it recommends moves grounded in this map and can build your plan."}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="close"
                style={{ ...S.closeBtn, marginLeft: 0 }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {sensitive ? (
                <div style={{ ...S.aiLeakWarn, borderColor: "#4d2a2a", color: "#e8a8a8" }}>
                  ⚠ <b>Sensitive topic.</b> Your messages are processed by the AI provider (this prototype runs on the Claude API; production runs on Grok via xAI). For a move like this, consider whether to involve an outside AI at all — and keep anything you type fully <b>generic</b>: never your name, address, employer, or account details.
                </div>
              ) : !warnOpen ? (
                <button style={S.warnTeaser} onClick={() => setWarnOpen(true)}>⚠ Conversations leave this site — read the tradeoff ▸</button>
              ) : (
                <div style={S.aiLeakWarn}>
                  ⚠ <b>Honest tradeoff:</b> your messages leave this site and are processed by the AI provider (this prototype runs on the Claude API; production runs on Grok via xAI). Privacy Atlas itself stores none of it — but the provider does. Describe your situation <b>generically</b>: never your name, address, employer, or account details.
                </div>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <button style={{ ...S.warnTeaser, color: "#8fe8de" }} onClick={() => setView("connect")}>✦ Prefer your own AI? Connect it over MCP — most private, your tokens ›</button>
            </div>

            <div style={{ marginTop: 12 }} onFocusCapture={() => setWarnOpen(true)} onClickCapture={() => setWarnOpen(true)}>
              <EmbeddedAIChat
                model={model}
                done={done}
                allowProgress
                onInspect={onInspect}
                onBuildPath={onBuildPath}
                nodeId={nodeId}
                deviceContext={deviceContext}
                regionContext={regionContext}
                starters={seeded ? starters : STARTERS}
                autoSend={seeded}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
