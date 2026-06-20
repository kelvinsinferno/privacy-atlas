# Privacy Atlas affiliate outreach

Operational email account:

- Address: `partnerships@privacyatlas.xyz`
- Display name: `Privacy Atlas Partnerships`
- Purpose: commercial/affiliate relationship outreach for privacy-aligned tools only.

## Standards

Affiliate outreach must not change the Atlas recommendation standard:

1. Free/open options stay listed first when they solve the same problem.
2. Paid products must genuinely help a Privacy Atlas move or threat context.
3. Affiliate links must be disclosed and tagged as sponsored/affiliate where rendered.
4. Do not pursue affiliate relationships for products that undermine privacy, sell user data, bundle trackers, or make misleading security claims.
5. Prefer programs with transparent pricing, clear cancellation, and no dark patterns.
6. Keep an audit trail: who was contacted, why they fit, what terms were offered, and whether accepted/rejected.


## Active affiliate relationships

### Amazon Associates

- Tracking ID: `privacyatlas-20`
- Use case: explicit fallback for privacy/security hardware, books, radios, satellite communicators, Faraday gear, hardware keys, and similar tools that support a specific Atlas move.
- Implementation rule: do **not** blanket-tag all Amazon URLs. The current `data/affiliate.ts` helper only tags Amazon links that intentionally opt in with `pa_affiliate=amazon`; neutral/help links stay untagged.
- Disclosure: Amazon links must be rendered/disclosed as affiliate links wherever surfaced to readers.

## Local helper

Use the non-secret helper script:

```bash
python scripts/privacy-atlas-mail.py check
python scripts/privacy-atlas-mail.py inbox --limit 10
python scripts/privacy-atlas-mail.py send --to partner@example.com --subject "Privacy Atlas affiliate partnership" --body-file /path/to/body.txt
```

Credentials live outside the repo in the active Hermes profile `.env`.

## Initial outreach template

Subject: Privacy Atlas affiliate partnership inquiry

Hi {{name/team}},

I help maintain Privacy Atlas, a public knowledge graph of concrete privacy moves for ordinary users: https://privacyatlas.xyz

We only pursue affiliate relationships for tools that genuinely fit the Atlas and that we can recommend honestly alongside free/open alternatives. {{product}} appears relevant to the Atlas because {{fit_reason}}.

A few questions before we consider adding an affiliate relationship:

1. Do you have a public affiliate or partner program?
2. What tracking parameters or disclosure language do you require?
3. Are there any data-sharing, analytics, or reseller terms we should understand before linking?
4. Can affiliate links point directly to the normal product page rather than a dark-pattern landing page?
5. Do you offer a free tier, trial, open-source edition, or discount code for privacy-conscious users?

If there is a fit, we would disclose the relationship clearly and continue listing free/open alternatives first where they meet the same need.

Best,
Privacy Atlas Partnerships
partnerships@privacyatlas.xyz
https://privacyatlas.xyz

## Tracking fields

For each outreach target, track:

- Product/company
- Website
- Atlas node(s) or threat(s) it maps to
- Free/open alternatives
- Why paid product is still useful
- Privacy/security concerns checked
- Affiliate program URL
- Contact email/form
- Date contacted
- Response
- Terms
- Decision
- Disclosure/link requirements
