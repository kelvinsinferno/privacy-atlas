import { browser } from "wxt/browser";
import { doneIdsFromJourney } from "../lib/progress";

export default defineContentScript({
  matches: ["https://privacyatlas.xyz/*", "http://localhost/*"],
  runAt: "document_idle",
  main() {
    const KEY = "pa:priv:journeyProgress"; // app namespaces localStorage via lib/storage.ts (pa:priv: prefix)
    const sync = () => {
      const ids = doneIdsFromJourney(localStorage.getItem(KEY));
      void browser.storage.local.set({ mirroredProgress: ids });
    };
    sync();
    // storage events fire for changes from OTHER tabs; filter to our key. (Same-tab writes
    // don't fire a storage event — covered by the initial sync + visibilitychange below.)
    window.addEventListener("storage", (e) => { if (e.key === KEY) sync(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
  },
});
