import { browser } from "wxt/browser";
import { classifyField } from "../lib/field-classify";
import { showFieldIcon, moveFieldIcon, hideFieldIcon, destroyFieldIcon, type FieldRect } from "../components/field-icon";
import type { FieldMeta, FieldSuggestion, FieldContext } from "../lib/field-types";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- wxt ContentScriptContext
  main(ctx: any) {
    try {
      let activeEl: HTMLInputElement | null = null;

      // Read METADATA ONLY — never el.value.
      const readMeta = (el: HTMLInputElement): FieldMeta => ({
        autocomplete: el.getAttribute("autocomplete") || "",
        type: el.type || "",
        name: el.name || "",
        id: el.id || "",
        placeholder: el.placeholder || "",
        ariaLabel: el.getAttribute("aria-label") || "",
        disabled: el.disabled,
        readOnly: el.readOnly,
        hidden: el.type === "hidden" || el.getClientRects().length === 0,
      });

      const rectOf = (el: Element): FieldRect => {
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      };

      const safeSuggest = async (context: FieldContext, host: string): Promise<FieldSuggestion | null> => {
        if (!browser.runtime?.id) return null;
        try {
          return (await browser.runtime.sendMessage({ type: "fieldSuggest", context, host })) as FieldSuggestion | null;
        } catch {
          return null;
        }
      };

      const onFocusIn = async (el: HTMLInputElement) => {
        hideFieldIcon();      // clear any prior field's icon first
        activeEl = null;
        const context = classifyField(readMeta(el));
        if (!context) return;
        const res = await safeSuggest(context, location.hostname);
        if (!res || document.activeElement !== el) return; // blurred during await
        activeEl = el;
        showFieldIcon(res, rectOf(el), location.hostname);
      };

      const reposition = () => { if (activeEl) moveFieldIcon(rectOf(activeEl)); };
      const onVisibility = () => { if (document.hidden) { activeEl = null; hideFieldIcon(); } };
      const onFocusOut = () => {
        // Defer: if focus didn't land on another input, the icon is stale → hide.
        setTimeout(() => {
          if (!(document.activeElement instanceof HTMLInputElement)) { activeEl = null; hideFieldIcon(); }
        }, 0);
      };
      const opts = { signal: ctx.signal as AbortSignal };
      document.addEventListener("focusin", (e) => {
        const el = e.target;
        if (el instanceof HTMLInputElement) { void onFocusIn(el); }
        else { activeEl = null; hideFieldIcon(); }
      }, opts);
      document.addEventListener("focusout", onFocusOut, opts);
      document.addEventListener("visibilitychange", onVisibility, opts);
      window.addEventListener("scroll", reposition, { capture: true, signal: ctx.signal as AbortSignal });
      window.addEventListener("resize", reposition, opts);
      ctx.onInvalidated(() => destroyFieldIcon());
    } catch {
      /* never let main() reject */
    }
  },
});
