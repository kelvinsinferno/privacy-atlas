"use client";
import { REVIEW_THRESHOLDS } from "./reviewer";
import { connectAndSignIn } from "@/lib/wallet";
import type { HowtoPayload, ResourcePayload, SourcePayload, RegionPayload, ReviewMeta } from "./types";

export interface NodeVoteState {
  confirms: number; flags: number; score: number;
  badge: "none" | "verified"; status: "verified" | "rejected" | "pending"; stale: boolean;
}
const EMPTY: NodeVoteState = { confirms: 0, flags: 0, score: 0, badge: "none", status: "pending", stale: false };

let _cache: Map<string, NodeVoteState> | null = null;
let _inflight: Promise<Map<string, NodeVoteState>> | null = null;

async function load(): Promise<Map<string, NodeVoteState>> {
  if (_cache) return _cache;
  if (!_inflight) {
    _inflight = (async () => {
      const res = await fetch("/api/contribute/list");
      if (!res.ok) throw new Error("vote state unavailable");
      const { items } = (await res.json()) as { items: Array<{ id: string; confirms?: number; flags?: number; badge?: "none" | "verified"; status: "verified" | "rejected" | "pending" }> };
      const m = new Map<string, NodeVoteState>();
      for (const it of items) {
        const confirms = it.confirms ?? 0, flags = it.flags ?? 0;
        m.set(it.id, { confirms, flags, score: confirms - flags, badge: it.badge ?? "none", status: it.status, stale: flags >= REVIEW_THRESHOLDS.flagsToReview && it.badge !== "verified" });
      }
      _cache = m;
      return m;
    })();
  }
  return _inflight;
}

/** Per-node vote state (EMPTY if unseen). Throws only if the backend is unavailable. */
export async function fetchNodeVoteState(id: string): Promise<NodeVoteState> {
  return (await load()).get(id) ?? EMPTY;
}

/** Cast a vote on any node id. Prompts wallet sign-in on 401. Invalidates the cache. */
export async function castNodeVote(id: string, vote: "confirm" | "flag"): Promise<{ ok: boolean; reason?: "signin" | string }> {
  const post = () => fetch("/api/contribute/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contributionId: id, vote }) });
  let res = await post();
  if (res.status === 401) {
    try { await connectAndSignIn(); } catch { return { ok: false, reason: "signin" }; }
    res = await post();
    if (res.status === 401) return { ok: false, reason: "signin" };
  }
  if (res.status === 403) { const { error } = await res.json().catch(() => ({})) as { error?: string }; return { ok: false, reason: error || "not eligible" }; }
  if (!res.ok) return { ok: false, reason: "vote failed" };
  _cache = null; _inflight = null;
  return { ok: true };
}

export interface HowtoView { id: string; payload: HowtoPayload; score: number; badge: "none" | "verified"; status: "verified" | "rejected" | "pending"; stale: boolean; }

/** Live community how-tos for a node (from /list). Empty on any failure (progressive). */
export async function fetchHowtos(nodeId: string): Promise<HowtoView[]> {
  try {
    const res = await fetch("/api/contribute/list");
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: Array<{ id: string; kind?: string; payload: unknown; confirms?: number; flags?: number; badge?: "none" | "verified"; status: "verified" | "rejected" | "pending" }> };
    return items
      .filter((it) => it.kind === "howto" && (it.payload as HowtoPayload | null)?.targetId === nodeId)
      .map((it) => {
        const confirms = it.confirms ?? 0, flags = it.flags ?? 0;
        return { id: it.id, payload: it.payload as HowtoPayload, score: confirms - flags, badge: it.badge ?? "none", status: it.status, stale: flags >= REVIEW_THRESHOLDS.flagsToReview && it.badge !== "verified" };
      });
  } catch { return []; }
}

export interface ResourceView { id: string; payload: ResourcePayload; score: number; badge: "none" | "verified"; status: "verified" | "rejected" | "pending"; stale: boolean; reviewMeta: ReviewMeta | null; }
export interface SourceView { id: string; payload: SourcePayload; score: number; badge: "none" | "verified"; status: "verified" | "rejected" | "pending"; stale: boolean; }

/** Live community resources for a node (from /list). Empty on any failure. */
export async function fetchResources(nodeId: string): Promise<ResourceView[]> {
  try {
    const res = await fetch("/api/contribute/list");
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: Array<{ id: string; kind?: string; payload: unknown; confirms?: number; flags?: number; badge?: "none" | "verified"; status: "verified" | "rejected" | "pending"; reviewMeta?: ReviewMeta | null }> };
    return items
      .filter((it) => it.kind === "resource" && (it.payload as ResourcePayload | null)?.targetId === nodeId)
      .map((it) => {
        const confirms = it.confirms ?? 0, flags = it.flags ?? 0;
        return { id: it.id, payload: it.payload as ResourcePayload, score: confirms - flags, badge: it.badge ?? "none", status: it.status, stale: flags >= REVIEW_THRESHOLDS.flagsToReview && it.badge !== "verified", reviewMeta: it.reviewMeta ?? null };
      });
  } catch { return []; }
}

/** Live community sources for a node (from /list). Empty on any failure. */
export async function fetchSources(nodeId: string): Promise<SourceView[]> {
  try {
    const res = await fetch("/api/contribute/list");
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: Array<{ id: string; kind?: string; payload: unknown; confirms?: number; flags?: number; badge?: "none" | "verified"; status: "verified" | "rejected" | "pending" }> };
    return items
      .filter((it) => it.kind === "source" && (it.payload as SourcePayload | null)?.targetId === nodeId)
      .map((it) => {
        const confirms = it.confirms ?? 0, flags = it.flags ?? 0;
        return { id: it.id, payload: it.payload as SourcePayload, score: confirms - flags, badge: it.badge ?? "none", status: it.status, stale: flags >= REVIEW_THRESHOLDS.flagsToReview && it.badge !== "verified" };
      });
  } catch { return []; }
}

// RegionView has no reviewMeta (commercial/affiliate metadata isn't surfaced for region overlays).
export interface RegionView { id: string; payload: RegionPayload; score: number; badge: "none" | "verified"; status: "verified" | "rejected" | "pending"; stale: boolean; }

/** Live community region overlays for a node (from /list). Empty on any failure. */
export async function fetchRegions(nodeId: string): Promise<RegionView[]> {
  try {
    const res = await fetch("/api/contribute/list");
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: Array<{ id: string; kind?: string; payload: unknown; confirms?: number; flags?: number; badge?: "none" | "verified"; status: "verified" | "rejected" | "pending" }> };
    return items
      .filter((it) => it.kind === "region" && (it.payload as RegionPayload | null)?.targetId === nodeId)
      .map((it) => {
        const confirms = it.confirms ?? 0, flags = it.flags ?? 0;
        return { id: it.id, payload: it.payload as RegionPayload, score: confirms - flags, badge: it.badge ?? "none", status: it.status, stale: flags >= REVIEW_THRESHOLDS.flagsToReview && it.badge !== "verified" };
      });
  } catch { return []; }
}
