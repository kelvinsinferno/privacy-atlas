import { describe, it, expect } from "vitest";
import { fieldSuggestion } from "../lib/field-suggest";
import { defaultSettings } from "../lib/alert-engine";
import type { GraphSubset, Settings } from "../lib/types";
import type { FieldMap } from "../lib/field-types";

const graph: GraphSubset = {
  threats: {},
  moves: {
    "masked-cards": { id: "masked-cards", label: "Pay with masked / virtual cards", summary: "…", domain: "economic" },
    "email-aliasing": { id: "email-aliasing", label: "Mask your email with aliases", summary: "…", domain: "digital" },
  },
};
const fieldMap: FieldMap = { email: ["email-aliasing"], payment: ["masked-cards"], phone: ["x"], address: ["y"] };
const base = (over: Partial<Settings> = {}): Settings => ({ ...defaultSettings(), ...over });
const ctx = { settings: base(), currentHost: "shop.example", graph, fieldMap, atlasUrl: "https://privacyatlas.xyz" };

describe("fieldSuggestion", () => {
  it("adopt mode when the move isn't done", () => {
    const r = fieldSuggestion({ ...ctx, context: "payment", doneMoveIds: new Set() });
    expect(r?.mode).toBe("adopt");
    expect(r?.moves[0]!.id).toBe("masked-cards");
    expect(r?.deepLink).toBe("https://privacyatlas.xyz/?node=masked-cards");
  });
  it("apply mode when the move is done", () => {
    const r = fieldSuggestion({ ...ctx, context: "payment", doneMoveIds: new Set(["masked-cards"]) });
    expect(r?.mode).toBe("apply");
  });
  it("null when field suggestions are globally off", () => {
    const r = fieldSuggestion({ ...ctx, context: "payment", doneMoveIds: new Set(), settings: base({ fieldSuggestionsEnabled: false }) });
    expect(r).toBeNull();
  });
  it("null when the site is muted (shared per-site mute)", () => {
    const r = fieldSuggestion({ ...ctx, context: "payment", doneMoveIds: new Set(), settings: base({ perSiteMutes: ["shop.example"] }) });
    expect(r).toBeNull();
  });
  it("null when the site is field-muted ('don't suggest here')", () => {
    const r = fieldSuggestion({ ...ctx, context: "payment", doneMoveIds: new Set(), settings: base({ fieldMutedSites: ["shop.example"] }) });
    expect(r).toBeNull();
  });
  it("null when the context is auto-quieted (>=3 dismissals)", () => {
    const r = fieldSuggestion({ ...ctx, context: "payment", doneMoveIds: new Set(), settings: base({ fieldDismissals: { ...defaultSettings().fieldDismissals, payment: 3 } }) });
    expect(r).toBeNull();
  });
  it("null when no move resolves in the graph subset", () => {
    const r = fieldSuggestion({ ...ctx, context: "phone", doneMoveIds: new Set() });
    expect(r).toBeNull(); // fieldMap.phone=["x"], not in graph.moves
  });
});
