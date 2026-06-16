"use client";

import { S } from "@/lib/styles";
import { SENSITIVE_NODES } from "@/data/ui-maps";
import type { ModelNode } from "@/lib/types";
import type { AISeed } from "@/components/ai/AIModal";

/* ---------- Ask AI: live Q&A hand-off to Grok (xAI free tier in production) ----------
   The static how-to is a starter; device-specific follow-ups go to a live model. We open
   the center-stage assistant (roomy, focused, offers the BYO-AI/MCP path) seeded with this
   move — nothing is sent until the user types, and it goes only to Grok. The sensitive-topic
   warning now lives in that modal (seeded via `sensitive`). */
interface AskGrokProps {
  node: ModelNode;
  openAI?: (seed: AISeed) => void;
}

export default function AskGrok({ node, openAI }: AskGrokProps) {
  const sensitive = SENSITIVE_NODES.has(node.id);
  const starterPrompt = 'Walk me through "' + node.label + '" step by step. Ask which device/OS I am on first, then give exact, current steps and warn me what commonly goes wrong.';
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ ...S.sectLabel, color: "#f0a868", margin: 0 }}>ASK AI · go deeper</div>
        <span style={{ ...S.commTag, borderColor: "#3a2a1a", color: "#f0a868" }}>runs in-site</span>
      </div>
      <div style={{ ...S.tiny, marginTop: 5, marginBottom: 8 }}>
        The how-to above is the starting point. For your exact device, OS version, or a step that is not working, ask the assistant — it knows this whole atlas and answers in a focused window right here.
      </div>
      <button
        style={S.aiBtn}
        onClick={() => openAI?.({ nodeId: node.id, title: node.label, sensitive, starters: [{ label: "give me exact current steps for my device", prompt: starterPrompt }] })}
      >
        💬 ask about this move
      </button>
    </div>
  );
}
