#!/usr/bin/env node
// AI-maintainer review pass (PLUG-IN POINT). Requires DATABASE_URL. Run with:
//   npx tsx scripts/maintainer-review.mjs
// With the default NoopReviewer this does nothing. To enable the agent: implement
// an `AiReviewer` in lib/contribute/reviewer.ts (wire it into getReviewer's "ai"
// case) and set MAINTAINER_REVIEWER=ai.
import { listContributions, setVerdict } from "../lib/db/queries.ts";
import { getReviewer, REVIEW_THRESHOLDS } from "../lib/contribute/reviewer.ts";

const reviewer = getReviewer();
const all = await listContributions();
// Only bother the reviewer with contributions the crowd has reacted to enough.
const candidates = all.filter(
  (c) => c.confirms >= REVIEW_THRESHOLDS.confirmsToReview || c.flags >= REVIEW_THRESHOLDS.flagsToReview
);

let acted = 0;
for (const c of candidates) {
  const v = await reviewer.review(c);
  if (v.verdict !== "skip") {
    await setVerdict(c.id, v);
    acted++;
  }
}
console.log(`maintainer review: ${candidates.length} candidate(s), ${acted} acted on (reviewer: ${reviewer.constructor.name})`);
