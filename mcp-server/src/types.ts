// Type definitions for the Privacy Atlas knowledge graph.

export type Friction = "none" | "low" | "med" | "high";
export type Maintenance = "once" | "periodic" | "ongoing";
export type EdgeType = "prereq" | "enables" | "sequence" | "tension" | "counters" | "reveals";

export interface Cost {
  money?: string;
  friction?: Friction;
  maintenance?: Maintenance;
}

export interface Source {
  title?: string;
  url?: string;
  kind?: string;
}

export interface MoveNode {
  id: string;
  label: string;
  domain: string;
  tier?: number;
  weight?: number;
  summary?: string;
  caveat?: string;
  failureMode?: string;
  residual?: string;
  cost?: Cost;
  actors?: string[];
  sources?: Source[];
  regionScope?: string;
  cadence?: string;
  ceiling?: string;
  community?: boolean;
  /** "action" | "awareness" | "trap" — traps are never recommended. */
  actionability?: string;
}

export interface ThreatNode {
  id: string;
  label: string;
  domain: string;
  trajectory?: string;
  tier?: number;
  counters?: string[];
  residual?: string;
  sources?: Source[];
}

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  guidance?: string;
}

export interface DomainDef {
  id: string;
  label?: string;
}

export interface Graph {
  version: string;
  domains: (DomainDef | string)[];
  nodes: MoveNode[];
  threats: ThreatNode[];
  edges: Edge[];
}

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}
