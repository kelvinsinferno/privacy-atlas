import type { ContributionWithStatus } from "./types";

/** A maintainer's verdict on a contribution's viability.
 *  - "verify":   grant the verified badge (peer-upvoted + confirmed to work)
 *  - "unverify": pull a previously-granted badge back to "none" but keep it live
 *                (the badge stood until downvotes piled up + a re-check no longer holds)
 *  - "reject":   remove it (peer-downvoted + confirmed not to work)
 *  - "skip":     no action / not confident enough */
export interface ReviewVerdict {
  verdict: "verify" | "unverify" | "reject" | "skip";
  reason?: string;
  reviewer: string; // e.g. "noop", "ai:grok-4.3"
}

/** Pluggable maintainer. The future AI agent is just another implementation. */
export interface ContributionReviewer {
  review(c: ContributionWithStatus): Promise<ReviewVerdict>;
}

/** Vote counts at which a contribution becomes worth an (AI) review. The agent
 *  reads these to decide which contributions to check; they are not enforced here. */
export const REVIEW_THRESHOLDS = {
  confirmsToReview: 5, // upvoted enough → candidate for a verified badge
  flagsToReview: 3,    // downvoted enough → candidate for removal
} as const;

/** Default reviewer: does nothing. No badges are granted until a real reviewer
 *  (the AI agent) is configured via MAINTAINER_REVIEWER. */
export class NoopReviewer implements ContributionReviewer {
  async review(_c: ContributionWithStatus): Promise<ReviewVerdict> {
    return { verdict: "skip", reviewer: "noop" };
  }
}

/** Select the maintainer reviewer from env. Defaults to NoopReviewer.
 *  When the AI agent lands: add an `AiReviewer` and return it for "ai". */
export function getReviewer(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): ContributionReviewer {
  switch (env.MAINTAINER_REVIEWER) {
    // case "ai": return new AiReviewer({ ... });  // <-- plug the agent in here
    default:
      return new NoopReviewer();
  }
}
