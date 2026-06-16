import type { FieldContext } from "./field-types";

export type LeakClass =
  | "advertising"
  | "analytics"
  | "fingerprinting"
  | "session-replay"
  | "social";

/** Raw, privacy-safe signal from the page: a sub-resource host or a touched API. No URLs, no query strings. */
export interface RawSignal {
  kind: "resource" | "behavioral";
  value: string; // resource → hostname; behavioral → api key (e.g. "canvas.toDataURL")
}

/** One Tracker Radar host entry, normalized to our leak classes. */
export interface TrackerRadarEntry {
  entity: string;        // owner org, e.g. "Google LLC"
  categories: LeakClass[];
}
export type TrackerRadar = Record<string, TrackerRadarEntry>; // hostname → entry

/** leak-class → Atlas threat ids. Source of truth: main repo data/leak-map.json. */
export interface LeakMap {
  categories: Record<LeakClass, string[]>;   // leak class → threat ids
  behavioral: Record<string, string[]>;      // behavioral api key → threat ids
}

/** Extension-side projection of a graph Node — only the fields the toast/popup render. */
export interface Move {
  id: string;
  label: string;
  summary: string;
  domain: string;
}
/** Extension-side projection of a graph Threat — only the fields alert logic needs. */
export interface ThreatRecord {
  id: string;
  label: string;
  residual: string;
  counters: string[]; // move ids
}
export interface GraphSubset {
  threats: Record<string, ThreatRecord>;
  moves: Record<string, Move>;
}

export interface ThreatHit {
  threatId: string;
  leakClass: LeakClass;
  entity?: string;
}

export type AlertMode = "adopt" | "apply";

export interface ToastPayload {
  threatId: string;
  threatLabel: string;
  leakClass: LeakClass;
  mode: AlertMode;
  moves: Move[];     // counter-moves
  deepLink: string;  // ATLAS_URL/?threat=<id>
}

export interface Settings {
  perTypeEnabled: Record<LeakClass, boolean>;
  perSiteMutes: string[];                 // hostnames
  dismissals: Record<LeakClass, number>;  // per-type dismissal counter (auto-quiet at >=3)
  fieldSuggestionsEnabled: boolean;              // global on/off for field suggestions (default true)
  fieldMutedSites: string[];                     // hostnames where field suggestions are silenced ("don't suggest here")
  fieldDismissals: Record<FieldContext, number>; // per-context dismissals (auto-quiet at >=3)
}

export interface DecideInput {
  hits: ThreatHit[];
  doneMoveIds: Set<string>; // caller builds this from the stored string[] (mirroredProgress); not JSON-serializable
  settings: Settings;
  currentHost: string;
  graph: GraphSubset;
  atlasUrl: string;
}
export interface DecideResult {
  toasts: ToastPayload[]; // suppressed by mute/toggle/auto-quiet
  overflow: ToastPayload[]; // non-suppressed threats beyond the on-page cap (shown on '+N more' expand; also in the popup)
  all: ToastPayload[];    // every detected threat regardless of suppression
  badge: number;          // distinct threat classes detected (counts even when toast suppressed)
}
