"use client";
import { S } from "@/lib/styles";
import { SENSITIVE_NODES } from "@/data/ui-maps";
import type { ModelNode } from "@/lib/types";
import type { AISeed } from "@/components/ai/AIModal";

interface StepHelpProps {
  node: ModelNode;
  steps: string[];
  device?: string;
  openAI?: (seed: AISeed) => void;
}

/** Per-card "stuck? get help" — opens the center-stage Grok assistant seeded with THIS
 *  card's exact steps + device. A troubleshooting back-and-forth deserves the roomy,
 *  focused modal (which also offers the BYO-AI/MCP path), not a cramped inline box.
 *  User-initiated: nothing hits the model until they send. */
export default function StepHelp({ node, steps, device, openAI }: StepHelpProps) {
  const sensitive = SENSITIVE_NODES.has(node.id);
  const prompt =
    `I'm following these steps to "${node.label}"${device ? ` on ${device}` : ""}, and I'm stuck:\n` +
    steps.map((s, i) => `${i + 1}. ${s}`).join("\n") +
    `\n\nAsk me which step I'm on or what I'm seeing, then give exact, current steps for my setup and flag what commonly goes wrong. Keep anything I share generic — don't ask for personal details.`;
  return (
    <div style={{ marginTop: 6 }}>
      <button
        style={{ ...S.tiny, background: "none", border: "none", color: "#f0a868", cursor: "pointer", padding: 0 }}
        onClick={() => openAI?.({ nodeId: node.id, title: node.label, sensitive, starters: [{ label: "help me with these exact steps", prompt }] })}
      >
        🤔 stuck on a step? get help →
      </button>
    </div>
  );
}
