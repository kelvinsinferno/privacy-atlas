"use client";

/* ---------- AILauncher ----------
   A persistent, labeled bottom-right pill, present on EVERY tab (rendered once
   in the shell, outside per-tab content). It's a real LABEL, not a bare sparkle —
   so people know what it does before they click. Auto-hides while the modal is
   open (`hidden`) so the two amber surfaces never overlap. */

import { S } from "@/lib/styles";

interface AILauncherProps {
  onOpen: () => void;
  hidden?: boolean;
}

export default function AILauncher({ onOpen, hidden }: AILauncherProps) {
  if (hidden) return null;
  return (
    <button
      style={S.aiLauncher}
      onClick={onOpen}
      aria-label="Ask the Atlas AI assistant"
    >
      ✦ Ask AI · build my plan
    </button>
  );
}
