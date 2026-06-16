import type { DecideResult, RawSignal } from "./types";
import type { FieldContext, FieldSuggestion } from "./field-types";

export interface AnalyzeRequest { type: "analyze"; signals: RawSignal[]; host: string; }
export interface DismissRequest { type: "dismiss"; leakClass: string; }
export interface MuteSiteRequest { type: "muteSite"; host: string; }
export interface ClearToastsRequest { type: "clearToasts"; }
export interface GetFindingsRequest { type: "getFindings"; }
export interface FieldSuggestRequest { type: "fieldSuggest"; context: FieldContext; host: string; }
export interface FieldDismissRequest { type: "fieldDismiss"; context: FieldContext; }
export interface FieldMuteSiteRequest { type: "fieldMuteSite"; host: string; }
export type LensMessage =
  | AnalyzeRequest | DismissRequest | MuteSiteRequest
  | FieldSuggestRequest | FieldDismissRequest | FieldMuteSiteRequest;
export type ContentMessage = ClearToastsRequest | GetFindingsRequest;
export type AnalyzeResponse = DecideResult;
export type FieldSuggestResponse = FieldSuggestion | null;
