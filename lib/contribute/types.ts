export type NodeKind = "move" | "threat";

export type ReviewBadge = "none" | "verified";

/** What a client may submit (server assigns id/ts/submitter; confirms/flags derived). */
export interface ProposedNodePayload {
  nodeKind: NodeKind;
  label: string;
  domain?: string;
  summary?: string;
  honesty?: string;
  rel?: string[];
  src?: { url?: string; title?: string };
}

/** A community how-to: ordered steps for doing a move on a given platform. */
export interface HowtoPayload {
  kind: "howto";
  targetId: string;
  platform: string;
  steps: string[];
  src?: { url?: string; title?: string };
}

export interface ResourcePayload {
  kind: "resource";
  targetId: string;
  name: string;
  url: string;
  forStep?: string;
  resourceType: "link" | "product";
}

export interface SourcePayload {
  kind: "source";
  targetId: string;
  title: string;
  url: string;
  sourceKind?: string;
}

/** A community per-country overlay for a move/threat. status required; rest optional. */
export interface RegionPayload {
  kind: "region";
  targetId: string;
  country: string; // ISO 3166-1 alpha-2
  status: "applies" | "different" | "not-applicable";
  note?: string;
  steps?: string[];
  law?: { name: string; ref?: string };
  src?: { url?: string; title?: string };
}

export interface AffiliateInfo {
  hasProgram?: boolean;
  url?: string;
  notes?: string;
}

export interface ReviewMeta {
  commercial?: boolean;
  affiliate?: AffiliateInfo;
  reviewedBy?: string;
  reviewedAt?: number;
}

export type ContributionPayload = ProposedNodePayload | HowtoPayload | ResourcePayload | SourcePayload | RegionPayload;
export type ContributionKind = "node" | "howto" | "resource" | "source" | "region";

/** A stored contribution row (payload + server fields). */
export interface ContributionRecord {
  id: string;
  kind: ContributionKind;
  payload: ContributionPayload;
  submitter: string;     // wallet address (lowercase)
  ts: number;            // ms epoch
  removed: boolean;
}

/** What /list returns: record + live tallies + computed status. */
export interface ContributionWithStatus {
  id: string;
  kind: ContributionKind;
  payload: ContributionPayload;
  ts: number;
  confirms: number;
  flags: number;
  status: "verified" | "rejected" | "pending";
  badge: ReviewBadge;          // AI-granted trust marker ("none" until the agent grants it)
  reviewedBy?: string | null;
  reviewedAt?: number | null;  // ms epoch
  reviewReason?: string | null;
  reviewMeta?: ReviewMeta | null;
}
