"use client";

import { useState } from "react";
import { S } from "@/lib/styles";
import { buildKnowledgeJSON, buildLlmsTxt } from "@/lib/knowledge";

type Show = null | "json" | "md";

export default function MachineAccess() {
  const [show, setShow] = useState<Show>(null);

  const text =
    show === "json"
      ? JSON.stringify(buildKnowledgeJSON(), null, 1)
      : show === "md"
      ? buildLlmsTxt()
      : "";

  return (
    <div style={{ ...S.contribStats, marginTop: 18 }}>
      <div style={{ ...S.sectLabel, color: "#7fb2ff", marginTop: 0 }}>
        AI &amp; MACHINE ACCESS
      </div>
      <div style={{ ...S.tiny, lineHeight: 1.55, marginBottom: 8 }}>
        Built to be read by machines as well as people — agents keeping it fresh,
        assistants answering from it, crawlers indexing it. Export the entire graph
        (every move, threat, edge, how-to, device variant, and tool) in one copy. In
        production this lives at a public JSON endpoint + llms.txt at the domain root.
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <button
          style={S.aiBtn}
          onClick={() => setShow(show === "json" ? null : "json")}
        >
          {show === "json" ? "hide" : "⧉ full JSON knowledge base"}
        </button>
        <button
          style={S.aiBtn}
          onClick={() => setShow(show === "md" ? null : "md")}
        >
          {show === "md" ? "hide" : "⧉ llms.txt (markdown index)"}
        </button>
        {show && (
          <button
            style={S.aiBtn}
            onClick={() => {
              try {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(text);
                }
              } catch {}
            }}
          >
            copy
          </button>
        )}
      </div>
      {show && (
        <textarea
          readOnly
          value={text}
          spellCheck={false}
          style={{
            ...S.input,
            minHeight: 160,
            marginTop: 8,
            resize: "vertical",
            fontFamily: "ui-monospace,monospace",
            fontSize: 10.5,
            lineHeight: 1.4,
          }}
        />
      )}
    </div>
  );
}
