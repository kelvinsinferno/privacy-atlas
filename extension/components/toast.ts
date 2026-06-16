import { browser } from "wxt/browser";
import { toastHeadline, toastBody } from "../lib/toast-copy";
import { C, FONT } from "../styles";
import type { ToastPayload } from "../lib/types";

/** Fire-and-forget message send that silently swallows "Extension context invalidated" errors. */
function safeSend(msg: unknown): void {
  if (!browser.runtime?.id) return; // context invalidated — runtime has no id
  try {
    void browser.runtime.sendMessage(msg).catch(() => {});
  } catch { /* context invalidated mid-send — ignore */ }
}

let host: HTMLDivElement | null = null;
let moreCard: HTMLElement | null = null;
let expanded = false;

/** Track which leak classes have already been counted for auto-quiet this page visit. */
const dismissedClasses = new Set<string>();

/** Threats the user dismissed or acted on this page visit — never re-mount them on-page. */
const suppressedThreatIds = new Set<string>();

/** Remove every visible toast card from the shadow root. */
export function clearAllToasts(): void {
  host?.shadowRoot?.querySelectorAll("[data-atlas-toast]").forEach((c) => c.remove());
  if (moreCard) { moreCard.remove(); moreCard = null; }
  expanded = false;
}

/** Mount (or append to) a Shadow-DOM toast stack, styled to match the Privacy Atlas web app. */
export function mountToast(p: ToastPayload): void {
  if (suppressedThreatIds.has(p.threatId)) return; // user dismissed/used this — don't resurrect
  if (!host) {
    host = document.createElement("div");
    host.style.cssText =
      "position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;max-height:calc(100vh - 32px);overflow-y:auto;";
    document.documentElement.appendChild(host);
    host.attachShadow({ mode: "open" });
  }
  const shadow = host.shadowRoot!;

  // BUG 1 dedupe: if a card for this threat already exists, do nothing.
  if (shadow.querySelector(`[data-atlas-toast="${CSS.escape(p.threatId)}"]`)) return;

  const card = document.createElement("div");
  card.setAttribute("data-atlas-toast", p.threatId);
  card.setAttribute("role", "status");
  card.setAttribute("aria-live", "polite");
  card.style.cssText = `font-family:${FONT.body};font-size:13px;max-width:300px;background:${C.surface};color:${C.text};border:1px solid ${C.border};border-left:3px solid ${C.amber};border-radius:8px;padding:11px 12px;box-shadow:0 6px 24px rgba(0,0,0,.4);`;
  card.innerHTML = `
    <div style="font-family:${FONT.mono};font-weight:700;color:${C.amber};margin-bottom:4px;">${toastHeadline(p)}</div>
    <div style="line-height:1.5;margin-bottom:8px;">${toastBody(p)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;font-family:${FONT.mono};font-size:11px;">
      <a href="${p.deepLink}" target="_blank" rel="noopener" style="color:${C.teal};text-decoration:none;">open in Atlas →</a>
      <button data-act="used" style="background:none;border:0;color:${C.green};cursor:pointer;font:inherit;">✓ used one</button>
      <button data-act="dismiss" style="background:none;border:0;color:${C.muted3};cursor:pointer;font:inherit;">dismiss</button>
      <button data-act="mute" style="background:none;border:0;color:${C.muted3};cursor:pointer;font:inherit;">mute site</button>
    </div>`;

  // BUG 3a: count at most one dismissal per leak class per page visit
  card.querySelector('[data-act="dismiss"]')!.addEventListener("click", () => {
    suppressedThreatIds.add(p.threatId);
    if (!dismissedClasses.has(p.leakClass)) {
      dismissedClasses.add(p.leakClass);
      safeSend({ type: "dismiss", leakClass: p.leakClass });
    }
    card.remove();
  });

  card.querySelector('[data-act="used"]')!.addEventListener("click", () => {
    suppressedThreatIds.add(p.threatId);
    card.remove();
  });

  // BUG 2: muting clears ALL visible toasts, not just this card
  card.querySelector('[data-act="mute"]')!.addEventListener("click", () => {
    safeSend({ type: "muteSite", host: location.hostname });
    clearAllToasts();
  });

  shadow.appendChild(card);
}

/** Show a clickable "+N more" footer that expands the overflow cards inline on click. */
export function applyOverflow(overflow: ToastPayload[]): void {
  if (expanded) {
    if (moreCard) { moreCard.remove(); moreCard = null; }
    for (const p of overflow) mountToast(p);
    return;
  }

  if (moreCard) { moreCard.remove(); moreCard = null; }
  const remaining = overflow.filter((p) => !suppressedThreatIds.has(p.threatId));
  if (remaining.length === 0 || !host?.shadowRoot) return;

  const card = document.createElement("div");
  card.setAttribute("data-atlas-more", String(remaining.length));
  card.style.cssText = `font-family:${FONT.mono};font-size:11px;color:${C.muted3};background:${C.surface};border:1px dashed ${C.border};border-radius:8px;padding:7px 11px;text-align:center;max-width:300px;cursor:pointer;`;
  card.textContent = `+${remaining.length} more on this page — click to show all`;

  card.addEventListener("click", () => {
    expanded = true;
    if (moreCard) { moreCard.remove(); moreCard = null; }
    for (const p of overflow) mountToast(p);
  });

  host.shadowRoot.appendChild(card);
  moreCard = card;
}
