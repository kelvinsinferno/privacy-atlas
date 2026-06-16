export const AFFILIATE: Record<string, (u: string) => string> = {
  // host -> function(url) returning the tagged url. Empty = pass through untagged (prototype default).
  // Example to enable later: "amazon.com": (u)=> u + (u.includes("?")?"&":"?") + "tag=YOURTAG-20",
};
export function affiliate(url: string): string {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) return "about:blank";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    for (const key in AFFILIATE) { if (host.endsWith(key)) return AFFILIATE[key](url); }
  } catch {}
  return url;
}
