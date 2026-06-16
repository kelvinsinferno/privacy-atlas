import { describe, it, expect } from "vitest";
import { buildKnowledgeJSON, buildLlmsTxt } from "./knowledge";
import { GRAPH } from "@/data/graph";

/* ------------------------------------------------------------------
   buildKnowledgeJSON
   ------------------------------------------------------------------ */

describe("buildKnowledgeJSON()", () => {
  const result = buildKnowledgeJSON();

  // ---- Top-level shape ----

  it("has project === 'Privacy Atlas'", () => {
    expect(result.project).toBe("Privacy Atlas");
  });

  it("has a non-empty version matching GRAPH.version", () => {
    expect(result.version).toBe(GRAPH.version);
    expect(result.version.length).toBeGreaterThan(0);
  });

  it("has a generated ISO timestamp string", () => {
    expect(typeof result.generated).toBe("string");
    expect(result.generated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("has a note field", () => {
    expect(typeof result.note).toBe("string");
    expect(result.note.length).toBeGreaterThan(0);
  });

  // ---- nodes ----

  it("nodes array length matches GRAPH.nodes (101)", () => {
    expect(result.nodes).toHaveLength(GRAPH.nodes.length);
    expect(result.nodes).toHaveLength(101);
  });

  it("each node carries the base fields from GRAPH (id, label, domain, tier, summary)", () => {
    const first = result.nodes[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.label).toBe("string");
    expect(typeof first.domain).toBe("string");
    expect(typeof first.tier).toBe("number");
    expect(typeof first.summary).toBe("string");
  });

  it("a node that has a HOWTOS entry carries a howto object with steps", () => {
    // device-disposal is in HOWTOS (first entry confirmed in data/howtos.ts)
    const node = result.nodes.find((n) => n.id === "device-disposal");
    expect(node).toBeDefined();
    expect(node!.howto).not.toBeNull();
    const howto = node!.howto as { platform: string; steps: string[] };
    expect(Array.isArray(howto.steps)).toBe(true);
    expect(howto.steps.length).toBeGreaterThan(0);
  });

  it("a node that has a HOWTO_VARIANTS entry carries a deviceVariants object", () => {
    // ad-id-reset is in HOWTO_VARIANTS
    const node = result.nodes.find((n) => n.id === "ad-id-reset");
    expect(node).toBeDefined();
    expect(node!.deviceVariants).not.toBeNull();
    const dv = node!.deviceVariants as { axis: string; variants: Record<string, unknown> };
    expect(typeof dv.axis).toBe("string");
    expect(typeof dv.variants).toBe("object");
  });

  it("a node with resources carries a non-empty resources array", () => {
    // device-disposal has resources in data/resources.ts
    const node = result.nodes.find((n) => n.id === "device-disposal");
    expect(node).toBeDefined();
    expect(Array.isArray(node!.resources)).toBe(true);
    expect((node!.resources as unknown[]).length).toBeGreaterThan(0);
  });

  it("every node has a howto field (non-undefined) — either a howto object or null", () => {
    // The field must always be present (never undefined) for a clean export shape
    result.nodes.forEach((n) => {
      expect(n).toHaveProperty("howto");
      // howto is either an object with steps or null — never undefined
      expect(n.howto === null || (typeof n.howto === "object" && n.howto !== null)).toBe(true);
    });
  });

  it("every node has a resources field that is an array", () => {
    result.nodes.forEach((n) => {
      expect(Array.isArray(n.resources)).toBe(true);
    });
  });

  // ---- threats ----

  it("threats array length matches GRAPH.threats (33)", () => {
    expect(result.threats).toHaveLength(GRAPH.threats.length);
    expect(result.threats).toHaveLength(33);
  });

  it("each threat carries id, label, trajectory, counters", () => {
    const t = result.threats[0];
    expect(typeof t.id).toBe("string");
    expect(typeof t.label).toBe("string");
    expect(typeof t.trajectory).toBe("string");
    expect(Array.isArray(t.counters)).toBe(true);
  });

  // ---- edges ----

  it("edges array is non-empty and matches GRAPH.edges", () => {
    expect(result.edges).toHaveLength(GRAPH.edges.length);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  // ---- journeys ----

  it("journeys array is non-empty", () => {
    expect(result.journeys.length).toBeGreaterThan(0);
  });

  it("each journey entry has id, title, section, stages", () => {
    const j = result.journeys[0];
    expect(typeof j.id).toBe("string");
    expect(typeof j.title).toBe("string");
    expect(typeof j.section).toBe("string");
    expect(Array.isArray(j.stages)).toBe(true);
  });

  // ---- SECURITY: zero user data ----

  it("serialized JSON contains NO journeyProgress key", () => {
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"journeyProgress"');
  });

  it("serialized JSON contains NO profile key", () => {
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"profile"');
  });

  it("serialized JSON contains NO devices key", () => {
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"devices"');
  });

  it("serialized JSON contains NO contributions key", () => {
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"contributions"');
  });

  // ---- Pure function: calling twice returns structurally identical data ----

  it("is deterministic on graph data (same node count on second call)", () => {
    const second = buildKnowledgeJSON();
    expect(second.nodes).toHaveLength(result.nodes.length);
    expect(second.threats).toHaveLength(result.threats.length);
  });
});

/* ------------------------------------------------------------------
   buildLlmsTxt
   ------------------------------------------------------------------ */

describe("buildLlmsTxt()", () => {
  const result = buildLlmsTxt();

  it("returns a non-empty string", () => {
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("starts with '# Privacy Atlas'", () => {
    expect(result.startsWith("# Privacy Atlas")).toBe(true);
  });

  it("contains the llms.txt style subtitle in the opening line", () => {
    expect(result).toContain("machine-readable index (llms.txt style)");
  });

  it("contains the node count in the summary blurb", () => {
    expect(result).toContain(String(GRAPH.nodes.length));
  });

  it("contains the threat count in the summary blurb", () => {
    expect(result).toContain(String(GRAPH.threats.length));
  });

  it("contains '## Moves' section header", () => {
    expect(result).toContain("## Moves");
  });

  it("contains '## Threats' section header", () => {
    expect(result).toContain("## Threats");
  });

  it("mentions a known move — password manager", () => {
    expect(result).toMatch(/password manager/i);
  });

  it("mentions a known move — encrypted messaging (Signal)", () => {
    expect(result).toMatch(/encrypted messaging/i);
  });

  it("each move line starts with '- **'", () => {
    const moveSection = result.split("## Threats")[0];
    const moveLines = moveSection
      .split("## Moves\n")[1]
      ?.split("\n")
      .filter((l) => l.trim().length > 0) ?? [];
    expect(moveLines.length).toBeGreaterThan(0);
    moveLines.forEach((line) => {
      expect(line).toMatch(/^- \*\*/);
    });
  });

  it("each threat line starts with '- **'", () => {
    const threatSection = result.split("## Threats\n")[1] ?? "";
    const threatLines = threatSection
      .split("\n")
      .filter((l) => l.trim().length > 0);
    expect(threatLines.length).toBeGreaterThan(0);
    threatLines.forEach((line) => {
      expect(line).toMatch(/^- \*\*/);
    });
  });

  it("move lines include domain and tier", () => {
    expect(result).toMatch(/\(foundation, tier \d\)/);
  });

  it("is deterministic (same length on second call)", () => {
    const second = buildLlmsTxt();
    expect(second.length).toBe(result.length);
  });
});
