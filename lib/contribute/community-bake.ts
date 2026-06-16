import type { ContributionWithStatus, HowtoPayload, ResourcePayload, SourcePayload, RegionPayload } from "./types";

export interface CommunityHowto { id: string; platform: string; steps: string[]; src?: { url?: string; title?: string }; }
export interface CommunityResource { id: string; name: string; url: string; forStep?: string; resourceType: "link" | "product"; }
export interface CommunitySource { id: string; title: string; url: string; sourceKind?: string; }
export interface CommunityRegion {
  id: string; country: string;
  status: "applies" | "different" | "not-applicable";
  note?: string; steps?: string[]; law?: { name: string; ref?: string }; src?: { url?: string; title?: string };
}
export interface CommunityLayer {
  howtos: Record<string, CommunityHowto[]>;
  resources: Record<string, CommunityResource[]>;
  sources: Record<string, CommunitySource[]>;
  regions: Record<string, CommunityRegion[]>;
}

const SEED_PREFIX: Record<string, string> = { howto: "howto:", resource: "res:", source: "src:", region: "reg:" };

/** Build the additive community-static layer: verified, NON-seed community
 *  how-tos/resources/sources/regions grouped by targetId. Seed is excluded by id-prefix
 *  (so /list never needs to expose `submitter`). Pure + regenerable. */
export function buildCommunityLayer(contributions: ContributionWithStatus[]): CommunityLayer {
  const out: CommunityLayer = { howtos: {}, resources: {}, sources: {}, regions: {} };
  for (const con of contributions) {
    const k = con.kind;
    if (k !== "howto" && k !== "resource" && k !== "source" && k !== "region") continue;
    if (con.badge !== "verified") continue;
    const prefix = SEED_PREFIX[k];
    if (prefix && con.id.startsWith(prefix)) continue;
    if (k === "howto") {
      const p = con.payload as HowtoPayload;
      if (!out.howtos[p.targetId]) out.howtos[p.targetId] = [];
      out.howtos[p.targetId]!.push({ id: con.id, platform: p.platform, steps: p.steps, ...(p.src ? { src: p.src } : {}) });
    } else if (k === "resource") {
      const p = con.payload as ResourcePayload;
      if (!out.resources[p.targetId]) out.resources[p.targetId] = [];
      out.resources[p.targetId]!.push({ id: con.id, name: p.name, url: p.url, resourceType: p.resourceType, ...(p.forStep ? { forStep: p.forStep } : {}) });
    } else if (k === "source") {
      const p = con.payload as SourcePayload;
      if (!out.sources[p.targetId]) out.sources[p.targetId] = [];
      out.sources[p.targetId]!.push({ id: con.id, title: p.title, url: p.url, ...(p.sourceKind ? { sourceKind: p.sourceKind } : {}) });
    } else {
      const p = con.payload as RegionPayload;
      if (!out.regions[p.targetId]) out.regions[p.targetId] = [];
      out.regions[p.targetId]!.push({
        id: con.id, country: p.country, status: p.status,
        ...(p.note ? { note: p.note } : {}),
        ...(p.steps ? { steps: p.steps } : {}),
        ...(p.law ? { law: p.law } : {}),
        ...(p.src ? { src: p.src } : {}),
      });
    }
  }
  return out;
}
