import { z } from "zod";
import type { ProposedNodePayload, HowtoPayload, ResourcePayload, SourcePayload, RegionPayload } from "./types";
import { isCountryCode } from "@/data/countries";

export const httpsUrl = z.string().trim().url().refine((u) => /^https:\/\//i.test(u), "must be https");
const src = z.object({ url: httpsUrl.optional(), title: z.string().trim().max(160).optional() }).optional();

const nodeSchema = z.object({
  nodeKind: z.enum(["move", "threat"]),
  label: z.string().trim().min(1).max(120),
  domain: z.string().trim().max(40).optional(),
  summary: z.string().trim().max(600).optional(),
  honesty: z.string().trim().max(600).optional(),
  rel: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  src,
});

const howtoSchema = z.object({
  kind: z.literal("howto"),
  targetId: z.string().trim().min(1).max(80),
  platform: z.string().trim().min(1).max(80),
  steps: z.array(z.string().trim().min(1).max(600)).min(1).max(40),
  src,
});

const resourceSchema = z.object({
  kind: z.literal("resource"),
  targetId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  url: httpsUrl,
  forStep: z.string().trim().max(200).optional(),
  resourceType: z.enum(["link", "product"]),
});

const sourceSchema = z.object({
  kind: z.literal("source"),
  targetId: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  url: httpsUrl,
  sourceKind: z.string().trim().max(24).optional(),
});

const regionSchema = z.object({
  kind: z.literal("region"),
  targetId: z.string().trim().min(1).max(80),
  country: z.string().trim().refine(isCountryCode, "unknown country"),
  status: z.enum(["applies", "different", "not-applicable"]),
  note: z.string().trim().max(600).optional(),
  steps: z.array(z.string().trim().min(1).max(600)).max(40).optional(),
  law: z.object({ name: z.string().trim().min(1).max(120), ref: z.string().trim().max(80).optional() }).optional(),
  src,
});

export type ValidateResult =
  | { ok: true; kind: "node"; value: ProposedNodePayload }
  | { ok: true; kind: "howto"; value: HowtoPayload }
  | { ok: true; kind: "resource"; value: ResourcePayload }
  | { ok: true; kind: "source"; value: SourcePayload }
  | { ok: true; kind: "region"; value: RegionPayload }
  | { ok: false; error: string };

/** Validate + normalize a submitted contribution payload. Pure. Branches on kind. */
export function validatePayload(input: unknown): ValidateResult {
  const kind = typeof input === "object" && input !== null ? (input as { kind?: unknown }).kind : undefined;
  if (kind === "howto") {
    const r = howtoSchema.safeParse(input);
    if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "invalid howto" };
    return { ok: true, kind: "howto", value: r.data as HowtoPayload };
  }
  if (kind === "resource") {
    const r = resourceSchema.safeParse(input);
    if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "invalid resource" };
    return { ok: true, kind: "resource", value: r.data as ResourcePayload };
  }
  if (kind === "source") {
    const r = sourceSchema.safeParse(input);
    if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "invalid source" };
    return { ok: true, kind: "source", value: r.data as SourcePayload };
  }
  if (kind === "region") {
    const r = regionSchema.safeParse(input);
    if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "invalid region" };
    return { ok: true, kind: "region", value: r.data as RegionPayload };
  }
  const r = nodeSchema.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "invalid payload" };
  return { ok: true, kind: "node", value: r.data as ProposedNodePayload };
}
