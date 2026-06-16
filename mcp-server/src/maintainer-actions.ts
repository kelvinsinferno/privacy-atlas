import { callMaintainer, type MaintainerResponse } from "./maintainer-client.js";

export interface VerdictArgs { contributionId: string; reason?: string; }
export interface ReviewMetaArgs { contributionId: string; commercial?: boolean; affiliate?: { hasProgram?: boolean; url?: string; notes?: string }; }

/** Tool-arg → maintainer REST call. Kept SDK-free so the mapping is unit-tested. */
export const actions = {
  list_pending: (): Promise<MaintainerResponse> => callMaintainer("queue", { method: "GET" }),
  grant_badge: (a: VerdictArgs) => callMaintainer("verdict", { method: "POST", body: { contributionId: a.contributionId, verdict: "verify", reason: a.reason } }),
  revoke_badge: (a: VerdictArgs) => callMaintainer("verdict", { method: "POST", body: { contributionId: a.contributionId, verdict: "unverify", reason: a.reason } }),
  reject: (a: VerdictArgs) => callMaintainer("verdict", { method: "POST", body: { contributionId: a.contributionId, verdict: "reject", reason: a.reason } }),
  set_review_meta: (a: ReviewMetaArgs) => callMaintainer("review-meta", { method: "POST", body: { contributionId: a.contributionId, commercial: a.commercial, affiliate: a.affiliate } }),
};
