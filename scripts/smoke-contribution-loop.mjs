#!/usr/bin/env node
// End-to-end smoke proof of the contribution loop, BELOW the HTTP/auth layer
// (that layer is unit-tested separately). Proves submit → vote → verify → bake:
//   1. insert a how-to contribution
//   2. clear the verify bar with confirm votes
//   3. setVerdict("verify") → it appears in the baked community layer
//   4. setVerdict("reject") → it disappears from the community layer
// Self-cleaning: always deletes its own test rows from the DB in a finally.
// CI-usable: exits non-zero if any assertion fails.
//
// Requires DATABASE_URL + NEON_LOCAL=1 (local proxy). Run from repo root:
//   DATABASE_URL='postgres://postgres:postgres@db.localtest.me:5432/main' \
//     NEON_LOCAL=1 npx tsx scripts/smoke-contribution-loop.mjs
import {
  insertContribution,
  castVote,
  setVerdict,
  listContributions,
} from "../lib/db/queries.ts";
import { buildCommunityLayer } from "../lib/contribute/community-bake.ts";
import { db } from "../lib/db/client.ts";
import { contributions, votes } from "../lib/db/schema.ts";
import { eq } from "drizzle-orm";

const ID = "smoke-howto-test";
const TARGET = "password-manager";

let failed = false;
function assert(ok, pass, fail) {
  if (ok) {
    console.log(`✓ ${pass}`);
  } else {
    console.log(`✗ FAIL: ${fail}`);
    failed = true;
  }
}

// Delete this smoke run's rows (votes first — FK-free but order kept tidy).
async function cleanup() {
  await db().delete(votes).where(eq(votes.contributionId, ID));
  await db().delete(contributions).where(eq(contributions.id, ID));
}

try {
  // Clean up first in case a prior run died before its finally.
  await cleanup();

  // 1. submit a how-to contribution
  await insertContribution({
    id: ID,
    kind: "howto",
    payload: {
      kind: "howto",
      targetId: TARGET,
      platform: "Smoke Test Device",
      steps: ["step one", "step two"],
    },
    submitter: "0xsmoke",
    ts: Date.now(),
    removed: false,
  });
  console.log(`submitted ${ID} (how-to for ${TARGET})`);

  // 2. cast enough confirm votes to clear the verify bar
  let cast = 0;
  for (let i = 0; i < 20; i++) {
    if (await castVote(ID, "0xvoter" + i, "confirm")) cast++;
  }
  console.log(`cast ${cast} confirm vote(s)`);

  // 3. verify → grants the badge → should appear in the baked layer
  await setVerdict(ID, { verdict: "verify", reviewer: "smoke" });
  console.log("setVerdict verify");
  const layer1 = buildCommunityLayer(await listContributions());
  const inLayer = (layer1.howtos[TARGET] ?? []).find((h) => h.id === ID);
  assert(
    !!inLayer && inLayer.platform === "Smoke Test Device",
    "verify → appears in community layer",
    "verified how-to not found in community layer"
  );

  // 4. reject → removes it → should disappear from the baked layer
  await setVerdict(ID, { verdict: "reject", reviewer: "smoke" });
  console.log("setVerdict reject");
  const layer2 = buildCommunityLayer(await listContributions());
  const stillThere = Object.values(layer2.howtos)
    .flat()
    .some((h) => h.id === ID);
  assert(
    !stillThere,
    "reject → gone from community layer",
    "rejected how-to still present in community layer"
  );
} finally {
  await cleanup();
  console.log("cleaned up");
}

process.exit(failed ? 1 : 0);
