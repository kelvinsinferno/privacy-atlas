import { browser } from "wxt/browser";
import { C, FONT } from "../styles";
import type { FieldContext, FieldSuggestion } from "../lib/field-types";

export interface FieldRect { top: number; left: number; width: number; height: number; }

// Short, mode-agnostic label per field context (popover gives the precise adopt/apply wording).
const CHIP_LABEL: Record<FieldContext, string> = {
  email: "Use an email alias",
  payment: "Use a masked card",
  phone: "Use a second number",
  address: "Hide your home address",
};

let host: HTMLDivElement | null = null;
let chipEl: HTMLButtonElement | null = null;
let popoverEl: HTMLElement | null = null;
let current: { suggestion: FieldSuggestion; host: string; rect: FieldRect } | null = null;

function shadow(): ShadowRoot {
  if (!host) {
    host = document.createElement("div");
    host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;";
    document.documentElement.appendChild(host);
    host.attachShadow({ mode: "open" });
  }
  return host.shadowRoot!;
}

function send(msg: unknown): void {
  if (!browser.runtime?.id) return;
  try {
    void browser.runtime.sendMessage(msg).catch(() => {});
  } catch {
    /* context invalidated */
  }
}

// Anchor an element just BELOW the field (left-aligned), clamped to the viewport's left edge.
function placeBelow(el: HTMLElement, rect: FieldRect): void {
  el.style.top = `${Math.round(rect.top + rect.height + 4)}px`;
  el.style.left = `${Math.round(Math.max(8, rect.left))}px`;
}

function closePopover(): void {
  if (popoverEl) {
    popoverEl.remove();
    popoverEl = null;
  }
}

function openPopover(): void {
  if (!current) return;
  const { suggestion: s, host: hostName, rect } = current;
  const root = shadow();
  const first = s.moves[0];
  const accent = s.mode === "apply" ? C.teal : C.amber;
  const body =
    s.mode === "adopt"
      ? `Atlas move: ${first ? first.label : ""}.`
      : `You set up "${first ? first.label : ""}" — use it here.`;
  const pop = document.createElement("div");
  pop.setAttribute("data-atlas-field-popover", "");
  pop.style.cssText = `position:fixed;width:272px;font-family:${FONT.body};font-size:13px;background:${C.surface};color:${C.text};border:1px solid ${C.border};border-left:3px solid ${accent};border-radius:8px;padding:11px 12px;box-shadow:0 6px 24px rgba(0,0,0,.4);`;
  pop.innerHTML = `
    <div style="font-family:${FONT.mono};font-weight:700;color:${accent};margin-bottom:4px;">${s.mode === "apply" ? "✦ You're equipped" : "✦ Privacy move"}</div>
    <div style="line-height:1.5;margin-bottom:8px;">${body}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;font-family:${FONT.mono};font-size:11px;">
      <a href="${s.deepLink}" target="_blank" rel="noopener" style="color:${C.teal};text-decoration:none;">open in Atlas →</a>
      <button data-act="used" style="background:none;border:0;color:${C.green};cursor:pointer;font:inherit;">✓ used one</button>
      <button data-act="dismiss" style="background:none;border:0;color:${C.muted3};cursor:pointer;font:inherit;">dismiss</button>
      <button data-act="never" style="background:none;border:0;color:${C.muted3};cursor:pointer;font:inherit;">don't suggest here</button>
    </div>`;
  pop.querySelector("a")!.addEventListener("click", () => hideFieldIcon());
  pop.querySelector('[data-act="used"]')!.addEventListener("click", () => hideFieldIcon());
  pop.querySelector('[data-act="dismiss"]')!.addEventListener("click", () => {
    send({ type: "fieldDismiss", context: s.context });
    hideFieldIcon();
  });
  pop.querySelector('[data-act="never"]')!.addEventListener("click", () => {
    send({ type: "fieldMuteSite", host: hostName });
    hideFieldIcon();
  });
  if (chipEl) chipEl.style.display = "none"; // collapse the chip while the popover is open
  root.appendChild(pop);
  popoverEl = pop;
  placeBelow(pop, rect);
}

/** Show the suggestion CHIP below a field. amber = adopt, teal = apply. */
export function showFieldIcon(suggestion: FieldSuggestion, rect: FieldRect, hostName: string): void {
  const root = shadow();
  current = { suggestion, host: hostName, rect };
  closePopover();
  const accent = suggestion.mode === "apply" ? C.teal : C.amber;
  if (!chipEl) {
    chipEl = document.createElement("button");
    chipEl.setAttribute("data-atlas-field-icon", "");
    // preventDefault on mousedown so clicking the chip doesn't blur the field
    chipEl.addEventListener("mousedown", (e) => e.preventDefault());
    chipEl.addEventListener("click", () => openPopover());
    root.appendChild(chipEl);
  }
  chipEl.textContent = `✦ ${CHIP_LABEL[suggestion.context]}`;
  chipEl.style.cssText = `position:fixed;display:block;max-width:260px;font-family:${FONT.mono};font-size:11px;text-align:left;border:1px solid ${C.border};border-left:3px solid ${accent};border-radius:7px;cursor:pointer;background:${C.surface};color:${accent};box-shadow:0 2px 8px rgba(0,0,0,.45);padding:5px 10px;white-space:nowrap;`;
  placeBelow(chipEl, rect);
}

/** Reposition the chip + popover (on scroll/resize). */
export function moveFieldIcon(rect: FieldRect): void {
  if (current) current.rect = rect;
  if (chipEl && chipEl.style.display !== "none") placeBelow(chipEl, rect);
  if (popoverEl) placeBelow(popoverEl, rect);
}

/** Hide the chip + popover (field blurred / no match / tab hidden). */
export function hideFieldIcon(): void {
  if (chipEl) chipEl.style.display = "none";
  closePopover();
  current = null;
}

/** Fully remove the overlay (host div + shadow) — call on context invalidation. */
export function destroyFieldIcon(): void {
  closePopover();
  if (host) {
    host.remove();
    host = null;
  }
  chipEl = null;
  current = null;
}
