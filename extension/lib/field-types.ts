import type { Move } from "./types";

export type FieldContext = "email" | "payment" | "phone" | "address";

export const FIELD_CONTEXTS = ["email", "payment", "phone", "address"] as const satisfies readonly FieldContext[];

/** Field METADATA only — never the value. Read from the element's attributes/props. */
export interface FieldMeta {
  autocomplete: string;
  type: string;
  name: string;
  id: string;
  placeholder: string;
  ariaLabel: string;
  disabled: boolean;
  readOnly: boolean;
  hidden: boolean;
}

/** field-context → move ids (source: data/field-map.json). */
export type FieldMap = Record<FieldContext, string[]>;

export interface FieldSuggestion {
  context: FieldContext;
  mode: "adopt" | "apply";
  moves: Move[];
  deepLink: string;
}
