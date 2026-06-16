import { browser } from "wxt/browser";
import { hostsFromEntries, toResourceSignals } from "../lib/collect";
import { mountToast, clearAllToasts, applyOverflow } from "../components/toast";
import type { RawSignal } from "../lib/types";
import type { AnalyzeResponse, ContentMessage } from "../lib/messages";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  // ctx is wxt's ContentScriptContext — provides ctx.isValid and ctx.onInvalidated().
  // Typed as `any` to avoid a fragile import path across wxt versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async main(ctx: any) {
    try {
      const pageHost = location.hostname;
      const behavioral: RawSignal[] = [];

      // Core analysis: build signals and ask the background to classify + decide.
      // Returns the full DecideResult (.all + .toasts) or null. The try/catch makes this
      // safe even if the extension context was invalidated (reloaded) — it degrades to null
      // rather than throwing, so the popup's getFindings still works whenever the runtime is live.
      const runAnalyze = async (): Promise<AnalyzeResponse | null> => {
        const urls = performance.getEntriesByType("resource").map((e) => e.name);
        const signals = [...toResourceSignals(hostsFromEntries(urls, pageHost)), ...behavioral];
        if (signals.length === 0) return null;
        try {
          return (await browser.runtime.sendMessage({ type: "analyze", signals, host: pageHost })) as AnalyzeResponse;
        } catch {
          return null;
        }
      };

      // Mount toasts for the current result (initial sweep + debounced observer).
      const analyze = async () => {
        const res = await runAnalyze();
        if (!res) return;
        try { for (const toast of res.toasts) mountToast(toast); applyOverflow(res.overflow); } catch { /* ignore render errors */ }
      };

      // popup → content messages. clearToasts: clear visible cards. getFindings: full list for the popup.
      browser.runtime.onMessage.addListener((msg: ContentMessage) => {
        if (msg.type === "clearToasts") { clearAllToasts(); return; }
        if (msg.type === "getFindings") return runAnalyze().then((res) => res?.all ?? []).catch(() => []);
      });

      // Behavioral signals from the page-world fp-hook. (A page can forge these — harmless.)
      window.addEventListener("message", (e) => {
        const d = e.data as { __atlasLens?: boolean; api?: unknown };
        if (e.source !== window || d.__atlasLens !== true) return;
        behavioral.push({ kind: "behavioral", value: String(d.api) });
      });

      // Inject the fingerprinting hook into the page's main world (getURL throws if context is gone).
      try {
        const s = document.createElement("script");
        s.src = browser.runtime.getURL("/fp-hook.js");
        s.onload = () => s.remove();
        (document.head || document.documentElement).appendChild(s);
      } catch { /* ignore */ }

      // Initial sweep is immediate; later resource bursts are debounced into one analyze().
      await analyze();
      let debounce: ReturnType<typeof setTimeout> | undefined;
      const obs = new PerformanceObserver(() => {
        if (debounce !== undefined) clearTimeout(debounce);
        debounce = setTimeout(() => { void analyze(); }, 500);
      });
      obs.observe({ entryTypes: ["resource"] });
      // Clean teardown when the context is genuinely invalidated (extension reload / newer script).
      ctx.onInvalidated(() => {
        obs.disconnect();
        if (debounce !== undefined) clearTimeout(debounce);
      });
    } catch {
      // Never let main() reject — a rejected content-script main surfaces as an uncaught
      // "Extension context invalidated" via the wxt wrapper's re-throw. Swallowing keeps the
      // console clean when the script starts on an already-invalidated context.
    }
  },
});
