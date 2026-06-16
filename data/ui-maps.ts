import { GRAPH } from "./graph";
import type { ActorEntry } from "@/lib/types";

export const DOMAIN: Record<string, { c: string; label: string }> = {
  foundation: { c: "#e8d9a0", label: "Foundation" },
  digital:    { c: "#5fd3c8", label: "Digital" },
  economic:   { c: "#7fb2ff", label: "Economic" },
  physical:   { c: "#f0a868", label: "Physical" },
  biometric:  { c: "#d98ad9", label: "Biometric" },
  comms:      { c: "#8ce29a", label: "Comms" },
  civic:      { c: "#c9c2b6", label: "Civic" },
};
export const DOMAIN_LETTER: Record<string, string> = {
  foundation: "F",
  digital:    "D",
  economic:   "E",
  physical:   "P",
  biometric:  "B",
  comms:      "C",
  civic:      "V",
};
export const THREAT_C = "#ff5c5c";
export const EDGE: Record<string, { c: string; dash: string; w: number; label: string }> = {
  prereq:   { c: "#9aa0b5", dash: "",      w: 1.4, label: "unlocks (prerequisite)" },
  enables:  { c: "#5fd3c8", dash: "5,4",   w: 1.0, label: "enables (synergy)" },
  sequence: { c: "#e8d9a0", dash: "1,5",   w: 1.0, label: "sequence (timing)" },
  tension:  { c: "#f0a868", dash: "7,4",   w: 1.2, label: "tension (tradeoff)" },
  counters: { c: "#ff5c5c", dash: "",      w: 1.1, label: "counters (defense→threat)" },
  reveals:  { c: "#d98ad9", dash: "2,4",   w: 1.0, label: "reveals (exposes)" },
};
export const TRAJ: Record<string, string> = {
  shrinking: "#8ce29a", steady: "#9aa0b5", variable: "#9aa0b5",
  growing: "#f0a868", emerging: "#f0c468", exploding: "#ff5c5c",
};
export const COSTC: Record<string, string> = { none: "#8ce29a", low: "#bfe08c", med: "#f0c468", high: "#ff8c6b" };
export const ACTORS: Record<string, ActorEntry> = (GRAPH.actors || []).reduce((m: Record<string, ActorEntry>, a) => ((m[a.id] = a), m), {} as Record<string, ActorEntry>);
export const TRAJ_W: Record<string, number> = { exploding: 3, growing: 2, emerging: 2, steady: 1, variable: 1, shrinking: 0 };
export const MONEY_PEN: Record<string, number> = { none: 0, low: 1, med: 2, high: 3 };
export const FRIC_PEN: Record<string, number> = { low: 0, med: 1, high: 2 };
export const WORRY: Record<string, { label: string; actors: string[] }> = {
  brokers:   { label: "Advertisers & data brokers", actors: ["advertiser", "broker", "platform"] },
  person:    { label: "A specific person (ex, stalker, harasser)", actors: ["stalker", "acquaintance"] },
  crime:     { label: "Identity thieves & scammers", actors: ["criminal"] },
  state:     { label: "Government & law enforcement", actors: ["local-le", "federal", "state-actor"] },
  broad:     { label: "Everything, broadly", actors: ["advertiser","broker","platform","stalker","acquaintance","criminal","local-le","federal","state-actor"] },
};
export const KINDBADGE: Record<string, string> = {
  primary: "PRIMARY", docs: "DOCS", research: "RESEARCH",
  org: "ORG", news: "NEWS", reference: "REF",
};
export const SENSITIVE_NODES: Set<string> = new Set([
  "reproductive-health-privacy", "address-confidentiality-program", "deniable-encryption",
  "non-kyc-rails", "anti-facial-recognition", "genetic-privacy", "ssn-lock", "physical-anonymity",
]);
export const RTYPE_C: Record<string, string> = { free: "#8ce29a", freemium: "#f0c468", product: "#7fb2ff", tool: "#7fb2ff", paid: "#f0a868", service: "#f0a868", org: "#9aa0b5", book: "#d98ad9" };
export const RTYPE_BADGE: Record<string, string> = { free: "FREE", freemium: "FREEMIUM", product: "BUY", tool: "TOOL", paid: "PAID", service: "SERVICE", org: "ORG", book: "BOOK" };
export const PRIVACY_CEILING = 0.92; // the bar maxes here, never at 1.0
export const RECHECK_DAYS: Record<string, number> = { periodic: 180, ongoing: 90 };
