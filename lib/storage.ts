/** Local-first KV matching the prototype's window.storage seam.
 *  shared=false → private user data (never leaves the device).
 *  shared=true  → crowdsourcing namespace (locally simulated this cycle; backend later).
 *  Async by design so a sync/remote adapter can drop in unchanged. */
type Rec = { value: string } | null;
const ns = (shared: boolean) => (shared ? "pa:shared:" : "pa:priv:");

export const storage = {
  async get(key: string, shared = false): Promise<Rec> {
    if (typeof window === "undefined") return null;
    try {
      const v = window.localStorage.getItem(ns(shared) + key);
      return v == null ? null : { value: v };
    } catch {
      return null; // private mode / access denied → behave as "not set"
    }
  },
  async set(key: string, value: string, shared = false): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ns(shared) + key, value);
    } catch {
      // quota exceeded / access denied → degrade to no-persistence rather than crash
    }
  },
};
