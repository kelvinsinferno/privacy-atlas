# Amazon SiteStripe image handoff

Amazon Product Advertising API access is not available until the Associates account demonstrates the required sales activity. Until then, Privacy Atlas should use **official Amazon Associates SiteStripe assets** for product images, not invented placeholders and not scraped/hotlinked images.

## Rule

Only add Amazon product pictures when they come from Amazon Associates tooling:

- SiteStripe image/link HTML copied from the logged-in Associates account, or
- Product Advertising API responses after PA API access is granted.

Do not use hand-made placeholder art for Amazon product recommendations.

## Current Amazon product slots awaiting official images

These resource cards have affiliate-tagged Amazon links and are ready for official images once SiteStripe snippets are available:

| Atlas node | Resource card | Search/product target |
|---|---|---|
| `strong-2fa` | YubiKey on Amazon | YubiKey 5 series |
| `strong-2fa` | OnlyKey on Amazon | OnlyKey FIDO2 |
| `faraday` | Faraday bags on Amazon | faraday bag phone key fob |
| `faraday` | Mission Darkness on Amazon | Mission Darkness faraday bag |
| `satellite-messaging` | Garmin inReach on Amazon | Garmin inReach Mini 2 |
| `home-address-ghost` | Extreme Privacy book on Amazon | Michael Bazzell Extreme Privacy |
| `signal-blocking-edc` | Signal-blocking EDC on Amazon | faraday wallet phone sleeve key fob |

## Owner handoff steps

In the normal Chrome browser where Amazon Associates is logged in:

1. Open the Amazon product page or search result you want to recommend.
2. Use SiteStripe at the top of the page.
3. Prefer an official image/link or image asset option if available.
4. Copy the full HTML snippet Amazon provides.
5. Paste the snippet into a private note or send it to Hermes.

If Amazon gives multiple image sizes, prefer a medium or large image that will look good in a 64–96px card thumbnail and on mobile.

## Hermes integration notes

When a SiteStripe snippet is provided:

1. Extract the official destination URL and image URL exactly as Amazon provides them.
2. Preserve `tag=privacyatlas-20` or the generated Associates tracking parameters.
3. Store only non-secret image/link metadata in `data/resources.ts` or a dedicated affiliate data file.
4. Keep the visible card disclosure covered by the existing affiliate disclosure.
5. Run:

```bash
npx vitest run data/affiliate.test.ts components/detail/ResourceList.test.tsx
npm run lint
npm run typecheck
npm run build
```

## Do not do

- Do not scrape Amazon images from page HTML.
- Do not hotlink arbitrary Amazon CDN URLs unless they came from SiteStripe/Associates tooling.
- Do not invent product images.
- Do not make Amazon the default for hardware wallets where direct manufacturer supply-chain trust is safer.
