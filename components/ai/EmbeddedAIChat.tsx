"use client";

/* eslint-disable react/no-unescaped-entities -- copy-heavy verbatim port */
/* eslint-disable @typescript-eslint/no-explicit-any -- loose msg/model data is acceptable */

/* ---------- EmbeddedAIChat (ref L466) ----------
   The real streaming chat. Ported VERBATIM from the prototype except the
   network call: instead of a non-streaming Anthropic fetch, it POSTs to the
   same-origin Grok proxy at /api/ai and consumes the SSE stream incrementally,
   updating the last assistant message live as tokens arrive.

   SECURITY/CONSENT (preserved exactly from the prototype):
   - The client only ever talks to /api/ai (same origin). No API key or external
     provider URL appears here.
   - The server builds the system prompt server-side; the client never sends a
     system key. The client sends { messages, nodeId?, progress? } only.
   - The progress-share checkbox (includeProgress) is OFF by default. The
     progressSummary() — a map of the user's defenses — is only sent as the
     `progress` field when allowProgress AND the box is checked.
   - The leak-warning copy and the "keep it generic, no names or addresses"
     placeholder are unchanged. */

import { useState, useRef, useEffect } from "react";
import { S } from "@/lib/styles";
import { extractAIPath } from "@/lib/ai-context";
import type { AIPath } from "@/lib/ai-context";
import { computePrivacyScore, dueForRecheck } from "@/lib/score";
import type { Model } from "@/lib/types";
import AIText from "@/components/ai/AIText";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  path?: AIPath | null;
}

interface Starter {
  label: string;
  prompt: string;
}

interface EmbeddedAIChatProps {
  onInspect?: (id: string) => void;
  nodeId?: string;
  model?: Model;
  done?: Record<string, number | boolean>;
  allowProgress?: boolean;
  starters?: Starter[];
  /** when true, the first starter is sent automatically on mount — used by the
   *  seeded help/ask popup so the assistant engages the move's context immediately
   *  (the user already opted in by clicking "get help"). */
  autoSend?: boolean;
  /** coarse non-PII device bucket (e.g. "phone_age:4plus") sent with each request */
  deviceContext?: string;
  /** coarse non-PII country bucket (e.g. "country:DE") sent with each request */
  regionContext?: string;
  onBuildPath?: (path: AIPath) => void;
}

export default function EmbeddedAIChat({
  onInspect,
  nodeId,
  model,
  done,
  allowProgress,
  starters,
  autoSend,
  deviceContext,
  regionContext,
  onBuildPath,
}: EmbeddedAIChatProps) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeProgress, setIncludeProgress] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream when the component unmounts
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const progressSummary = () => {
    if (!model || !done) return "";
    const ns = model.all.filter((x) => x.kind === "node");
    const sc = computePrivacyScore(model, done);
    const doneL = ns.filter((n) => done[n.id]).map((n) => n.label);
    const dueL = ns.filter((n) => dueForRecheck(n as any, done[n.id])).map((n) => n.label);
    return (
      "USER PROGRESS (shared with explicit consent): score " +
      Math.round(sc.pct * 100) +
      "% (" +
      sc.lab +
      "). Completed: " +
      (doneL.join(", ") || "none") +
      ". Due for re-check: " +
      (dueL.join(", ") || "none") +
      "."
    );
  };

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || busy) return;
    const history: ChatMsg[] = [...msgs, { role: "user", content }];
    setMsgs(history);
    setInput("");
    setBusy(true);
    setErr(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          ...(nodeId ? { nodeId } : {}),
          ...(deviceContext ? { deviceContext } : {}),
          ...(regionContext ? { regionContext } : {}),
          ...(allowProgress && includeProgress ? { progress: progressSummary() } : {}),
        }),
        signal: ctrl.signal,
      });

      if (!r.ok) {
        // Remove trailing empty assistant bubble (if any) before showing error
        setMsgs((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.content === "") {
            return prev.slice(0, -1);
          }
          return prev;
        });
        if (r.status === 429) {
          setErr("The assistant is busy right now (rate limit) — give it a minute and try again.");
        } else if (r.status === 413) {
          setErr("That message is too long — try a shorter question.");
        } else {
          setErr("The assistant couldn't respond just now — try again in a moment.");
        }
        return;
      }

      if (!r.body) throw new Error("ai unavailable");

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buf = "";
      // push an empty assistant message first so the UI shows it streaming
      setMsgs((prev) => [...prev, { role: "assistant", content: "" }]);
      for (;;) {
        const { done: rdone, value } = await reader.read();
        if (rdone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || ""; // keep the last partial line in the buffer
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const tok = j.choices?.[0]?.delta?.content || "";
            if (tok) {
              acc += tok;
              // update the LAST assistant message's content live
              setMsgs((prev) => {
                const copy = prev.slice();
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            /* ignore non-JSON keepalive lines */
          }
        }
      }
      if (!acc.trim()) throw new Error("empty");
      // stream finished: run extractAIPath on the full text, attach path to the last message
      const parsed = extractAIPath(acc);
      setMsgs((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = {
          role: "assistant",
          content: parsed.text || acc,
          path: parsed.path,
        };
        return copy;
      });
    } catch (e: unknown) {
      // If the fetch was aborted (component unmounting), stop silently — no error UI
      if ((e instanceof Error && e.name === "AbortError") || ctrl.signal.aborted) {
        return;
      }
      // Real network / server error: remove the trailing empty assistant bubble (if any)
      // so no blank message persists alongside the error line
      setMsgs((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && last.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setErr("The assistant couldn't respond just now — try again in a moment.");
    } finally {
      if (!ctrl.signal.aborted) setBusy(false);
    }
  };

  // Auto-send the first starter on mount when asked (seeded help/ask popup). The
  // setTimeout + clearTimeout pair makes this fire exactly once, including under
  // React StrictMode's mount→cleanup→remount double-invoke in dev.
  useEffect(() => {
    if (!autoSend || !starters || starters.length === 0) return;
    const first = starters[0];
    if (!first) return;
    const id = setTimeout(() => send(first.prompt), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; send/starters are stable for a given open
  }, []);

  return (
    <div>
      {msgs.length === 0 && starters && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
          {starters.map((st, i) => (
            <button key={i} style={S.aiBtn} onClick={() => send(st.prompt)}>
              {st.label}
            </button>
          ))}
        </div>
      )}
      {msgs.length > 0 && (
        <div style={S.aiChatBox}>
          {msgs.map((m, i) => (
            <div key={i} style={m.role === "user" ? S.aiMsgUser : S.aiMsgBot}>
              {m.role === "assistant" ? (
                <AIText text={m.content} onInspect={onInspect} />
              ) : (
                m.content
              )}
              {m.role === "assistant" && m.path && onBuildPath && (
                <div
                  style={{
                    marginTop: 9,
                    padding: "9px 11px",
                    background: "#0e1a1e",
                    border: "1px solid #2a5d63",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ color: "#5fd3c8", fontSize: 12.5, fontWeight: 600 }}>
                    ✦ Custom path ready — {m.path.moves.length} moves
                  </div>
                  {m.path.reason && (
                    <div style={{ ...S.tiny, margin: "3px 0 7px" }}>{m.path.reason}</div>
                  )}
                  <button
                    style={{ ...S.aiBtn, borderColor: "#2a5d63", color: "#5fd3c8" }}
                    onClick={() => onBuildPath(m.path!)}
                  >
                    build this as my path →
                  </button>
                </div>
              )}
            </div>
          ))}
          {busy && <div style={{ ...S.aiMsgBot, opacity: 0.6 }}>thinking…</div>}
          {err && <div style={{ ...S.tiny, color: "#ff8c6b" }}>{err}</div>}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder={
            msgs.length
              ? "reply…"
              : "or type your own question — keep it generic, no names or addresses"
          }
          style={{ ...S.input, marginBottom: 0, flex: 1 }}
        />
        <button
          style={{ ...S.aiBtn, opacity: busy ? 0.5 : 1 }}
          onClick={() => send()}
          disabled={busy}
        >
          {busy ? "…" : "send"}
        </button>
      </div>
      {allowProgress && (
        <label
          style={{
            display: "flex",
            gap: 7,
            alignItems: "flex-start",
            marginTop: 9,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={includeProgress}
            onChange={(e) => setIncludeProgress(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span style={{ ...S.tiny, lineHeight: 1.5 }}>
            Share my progress summary (score, completed moves, re-checks due) with the
            assistant for a personalized read.{" "}
            <span style={{ color: "#f0a868" }}>
              This sends your list of defenses to the AI provider — it's a map of how
              you're protected. Off by default for a reason.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
