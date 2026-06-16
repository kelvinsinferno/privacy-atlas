import { describe, it, expect } from "vitest";
import { nodeJsonLd, safeJsonLdString } from "./jsonld";
import { buildModel } from "@/lib/model";
import type { ModelNode } from "@/lib/types";

const model = buildModel({});
const getNode = (id: string): ModelNode => {
  const n = model.byId.get(id);
  if (!n) throw new Error("test fixture missing node: " + id);
  return n;
};

/* ------------------------------------------------------------------
   nodeJsonLd — DefinedTerm (node without howto steps)
   ------------------------------------------------------------------ */

describe("nodeJsonLd() — DefinedTerm shape", () => {
  // password-manager has a howto, so pick a node that maps to DefinedTerm.
  // T-BROKER is a threat with no howto steps → DefinedTerm.
  const threatNode = getNode("T-BROKER");
  const ld = nodeJsonLd(threatNode);

  it("has @context === 'https://schema.org'", () => {
    expect(ld["@context"]).toBe("https://schema.org");
  });

  it("name matches the node label", () => {
    expect(ld.name).toBe(threatNode.label);
  });

  it("description is a non-empty string", () => {
    expect(typeof ld.description).toBe("string");
  });

  it("@type is DefinedTerm for a threat node with no howto", () => {
    expect(ld["@type"]).toBe("DefinedTerm");
  });

  it("does not include a step array for DefinedTerm", () => {
    expect(ld.step).toBeUndefined();
  });

  it("includes inDefinedTermSet pointing to the knowledge endpoint", () => {
    expect(ld.inDefinedTermSet).toMatch(/knowledge/);
  });
});

/* ------------------------------------------------------------------
   nodeJsonLd — THREAT node description sourced from residual
   ------------------------------------------------------------------ */

describe("nodeJsonLd() — threat description from residual", () => {
  // T-BROKER has no summary field; its description must come from residual
  const threatNode = getNode("T-BROKER");
  const residual = (threatNode as unknown as { residual: string }).residual;
  const ld = nodeJsonLd(threatNode);

  it("threat node description is non-empty (sourced from residual)", () => {
    expect(ld.description.length).toBeGreaterThan(0);
  });

  it("threat node description equals the residual field", () => {
    expect(ld.description).toBe(residual);
  });
});

/* ------------------------------------------------------------------
   nodeJsonLd — HowTo shape (node with howto steps)
   ------------------------------------------------------------------ */

describe("nodeJsonLd() — HowTo shape", () => {
  // password-manager is in HOWTOS (verified via knowledge.test.ts fixture)
  const moveNode = getNode("password-manager");
  const ld = nodeJsonLd(moveNode);

  it("has @context === 'https://schema.org'", () => {
    expect(ld["@context"]).toBe("https://schema.org");
  });

  it("@type is HowTo when the node has howto steps", () => {
    expect(ld["@type"]).toBe("HowTo");
  });

  it("name matches the node label", () => {
    expect(ld.name).toBe(moveNode.label);
  });

  it("description is a non-empty string", () => {
    expect(typeof ld.description).toBe("string");
    expect(ld.description.length).toBeGreaterThan(0);
  });

  it("step is an array of HowToStep objects", () => {
    expect(Array.isArray(ld.step)).toBe(true);
    expect(ld.step!.length).toBeGreaterThan(0);
    ld.step!.forEach((s) => {
      expect(s["@type"]).toBe("HowToStep");
      expect(typeof s.text).toBe("string");
      expect(s.text.length).toBeGreaterThan(0);
    });
  });
});

/* ------------------------------------------------------------------
   nodeJsonLd — device-disposal (known to have steps in HOWTOS)
   ------------------------------------------------------------------ */

describe("nodeJsonLd() — device-disposal (verified howto steps)", () => {
  const node = getNode("device-disposal");
  const ld = nodeJsonLd(node);

  it("is HowTo", () => {
    expect(ld["@type"]).toBe("HowTo");
  });

  it("step array has at least 5 entries", () => {
    expect(ld.step!.length).toBeGreaterThanOrEqual(5);
  });
});

/* ------------------------------------------------------------------
   safeJsonLdString — XSS escaping
   ------------------------------------------------------------------ */

describe("safeJsonLdString()", () => {
  it("escapes < as \\u003c", () => {
    const node = getNode("password-manager");
    const ld = nodeJsonLd(node);
    // Inject a synthetic < to verify escaping
    const dangerous = { ...ld, description: "foo <bar> & 'baz'" };
    const safe = safeJsonLdString(dangerous as typeof ld);
    expect(safe).not.toContain("<");
    expect(safe).not.toContain(">");
    expect(safe).toContain("\\u003c");
    expect(safe).toContain("\\u003e");
    expect(safe).toContain("\\u0026");
  });

  it("safeJsonLdString escapes a </script> breakout payload", () => {
    const malicious = { "@context": "https://schema.org" as const, name: "x", description: "</script><script>alert(1)</script> & <img src=x>", "@type": "DefinedTerm" as const, inDefinedTermSet: "https://privacy-atlas.app/api/knowledge" };
    const out = safeJsonLdString(malicious);
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).toContain("\\u003c");  // < was escaped
    expect(out).toContain("\\u003e");  // > was escaped
    expect(out).toContain("\\u0026");  // & was escaped
    expect(() => JSON.parse(out)).not.toThrow(); // still valid JSON
  });

  it("output is valid JSON when parsed", () => {
    const node = getNode("password-manager");
    const ld = nodeJsonLd(node);
    const safe = safeJsonLdString(ld);
    // Unicode escapes are valid JSON — parse should succeed
    expect(() => JSON.parse(safe)).not.toThrow();
  });
});
