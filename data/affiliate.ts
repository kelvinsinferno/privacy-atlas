const AMAZON_ASSOCIATES_TRACKING_ID = "privacyatlas-20";
const AMAZON_OPT_IN_PARAM = "pa_affiliate";

function amazonAffiliate(url: string): string {
  const parsed = new URL(url);

  // Do not blanket-monetize every Amazon URL. Amazon links are tagged only
  // when a resource explicitly opts in with ?pa_affiliate=amazon. This keeps
  // neutral/help links such as Amazon Locker or Alexa privacy settings untagged.
  if (parsed.searchParams.get(AMAZON_OPT_IN_PARAM) !== "amazon") return url;

  parsed.searchParams.delete(AMAZON_OPT_IN_PARAM);
  parsed.searchParams.set("tag", AMAZON_ASSOCIATES_TRACKING_ID);
  return parsed.toString();
}

export const AFFILIATE: Record<string, (u: string) => string> = {
  // host -> function(url) returning the tagged url.
  "amazon.com": amazonAffiliate,
};

export function affiliate(url: string): string {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) return "about:blank";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    for (const key in AFFILIATE) { if (host.endsWith(key)) return AFFILIATE[key](url); }
  } catch {}
  return url;
}
