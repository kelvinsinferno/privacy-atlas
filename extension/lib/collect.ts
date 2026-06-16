import type { RawSignal } from "./types";

/** Unique hostnames parsed from resource URLs, excluding the page's own host. */
export function hostsFromEntries(urls: string[], pageHost: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    let host: string;
    try { host = new URL(u).hostname; } catch { continue; }
    if (host === pageHost) continue;
    if (seen.has(host)) continue;
    seen.add(host);
    out.push(host);
  }
  return out;
}

export function toResourceSignals(hosts: string[]): RawSignal[] {
  return hosts.map((value) => ({ kind: "resource" as const, value }));
}
