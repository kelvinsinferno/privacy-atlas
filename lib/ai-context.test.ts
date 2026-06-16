import { describe, expect, it } from "vitest";
import { aiSystem, buildAIContext, extractAIPath, nodeContext } from "./ai-context";

describe("aiSystem()", () => {
  // Run once; the function is pure and deterministic
  const result = aiSystem();

  it("returns a string", () => {
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------------
  // 1. Knowledge-base content is embedded
  // ----------------------------------------------------------------
  describe("embeds the knowledge base (buildAIContext content)", () => {
    it("contains the MISSIONS section header", () => {
      expect(result).toContain("MISSIONS");
    });

    it("contains a known mission label from JOURNEYS", () => {
      // "Lock the foundations" is the first journey label in data/journeys.ts
      expect(result).toMatch(/Lock the foundations/i);
    });

    it("contains a known move name (password manager node)", () => {
      // The password-manager node label appears in the knowledge base
      expect(result).toMatch(/password manager/i);
    });

    it("contains the THREATS section header", () => {
      expect(result).toContain("THREATS");
    });

    it("contains the MOVES section header", () => {
      expect(result).toContain("MOVES:");
    });

    it("matches the full buildAIContext() output as a prefix", () => {
      const ctx = buildAIContext();
      expect(result.startsWith(ctx)).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // 2. All 6 safety rules are present
  // ----------------------------------------------------------------
  describe("safety rules", () => {
    it("rule 1 — one question at a time", () => {
      // Exact phrase from source: "Interview ONE question at a time"
      expect(result).toMatch(/ONE question at a time/i);
    });

    it("rule 1 — under 180 words limit", () => {
      // Exact substring: "keep replies under 180 words"
      expect(result).toContain("180 words");
    });

    it("rule 2 — ground recommendations in knowledge base", () => {
      // Exact phrase: "Ground every recommendation in the knowledge base"
      expect(result).toMatch(/Ground every recommendation in the knowledge base/i);
    });

    it("rule 2 — [[double brackets]] linkify instruction", () => {
      // Exact phrase: "wrap its EXACT label in [[double brackets]]"
      expect(result).toMatch(/\[\[double brackets\]\]/);
    });

    it("rule 3 — honest about limits / never promise invisibility", () => {
      // Exact phrase: "never promise invisibility"
      expect(result).toMatch(/never promise invisibility/i);
    });

    it("rule 4 — refuse identifying details (names, addresses)", () => {
      // Exact phrase: "NEVER ask for or accept names, addresses"
      expect(result).toMatch(/NEVER ask for or accept names, addresses/i);
    });

    it("rule 4 — employer and account numbers also listed", () => {
      expect(result).toMatch(/employers, account numbers/i);
    });

    it("rule 6 — PATH block format instruction present", () => {
      // Exact substring from source
      expect(result).toContain("```PATH");
    });

    it("rule 6 — PATH block contains the worry mapping string", () => {
      // The worry mapping enum line appears in the PATH format block
      expect(result).toMatch(/brokers|person|crime|state|broad/);
    });

    it("rule 6 — moves: 6-12 instruction present", () => {
      expect(result).toMatch(/6-12/);
    });

    it("rule 0 — off-topic scope/decline rule present", () => {
      // SECURITY: the un-strippable topic gate. The server bakes this in so
      // the AI cannot be used as free, unrestricted general-purpose Grok.
      expect(result).toMatch(/ONLY help with personal privacy/i);
      expect(result).toMatch(/politely decline.*redirect|redirect them to a privacy topic/i);
    });
  });

  // ----------------------------------------------------------------
  // 3. Optional extra argument is appended correctly
  // ----------------------------------------------------------------
  describe("extra argument", () => {
    const EXTRA = "SOME_EXTRA_CONTEXT";
    const withExtra = aiSystem(EXTRA);
    const withoutExtra = aiSystem();

    it("aiSystem(extra) contains the extra string", () => {
      expect(withExtra).toContain(EXTRA);
    });

    it("aiSystem() (no arg) does NOT contain the extra string", () => {
      expect(withoutExtra).not.toContain(EXTRA);
    });

    it("extra is appended with a preceding newline", () => {
      // Source: (extra ? "\n" + extra : "")
      expect(withExtra).toContain("\n" + EXTRA);
    });

    it("aiSystem(extra) is longer than aiSystem() by exactly newline+extra chars", () => {
      expect(withExtra.length).toBe(withoutExtra.length + ("\n" + EXTRA).length);
    });

    it("aiSystem(extra) still contains all safety rules", () => {
      // Quick smoke-check that extra does not somehow replace the rules
      expect(withExtra).toMatch(/ONE question at a time/i);
      expect(withExtra).toContain("180 words");
      expect(withExtra).toMatch(/never promise invisibility/i);
    });

    it("empty string extra behaves the same as no arg", () => {
      // When extra is "" the ternary is falsy — no newline appended
      const withEmpty = aiSystem("");
      expect(withEmpty).toBe(withoutExtra);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  nodeContext                                                         */
/* ------------------------------------------------------------------ */

describe("nodeContext()", () => {
  it("contains the node's label for a known node id", () => {
    const ctx = nodeContext("password-manager");
    // "Password manager" is the label of the password-manager node in data/graph
    expect(ctx).toMatch(/Password manager/i);
    expect(ctx).toContain("Focus your help on executing THIS move");
  });

  it("returns empty string for an unknown node id", () => {
    expect(nodeContext("does-not-exist")).toBe("");
  });

  it("returns empty string for an empty node id", () => {
    expect(nodeContext("")).toBe("");
  });
});

/* ------------------------------------------------------------------ */
/*  extractAIPath                                                       */
/* ------------------------------------------------------------------ */

describe("extractAIPath()", () => {
  // Shared valid PATH payload with 3 moves (meets anti-hallucination gate)
  const validPath = JSON.stringify({
    profile: { worry: "brokers", friction: "low", level: "beginner" },
    reason: "Covers the basics for a data-broker threat model.",
    moves: ["Use a password manager", "Enable 2FA", "Opt out of data brokers"],
  });

  // ----------------------------------------------------------------
  // 1. Valid PATH block with >=3 moves
  // ----------------------------------------------------------------
  describe("valid PATH block with >=3 moves", () => {
    const reply = `Here is your plan.\n\`\`\`PATH\n${validPath}\n\`\`\`\nGood luck!`;
    const result = extractAIPath(reply);

    it("returns a non-null path", () => {
      expect(result.path).not.toBeNull();
    });

    it("path.moves contains all three moves", () => {
      expect(result.path!.moves).toHaveLength(3);
      expect(result.path!.moves).toContain("Use a password manager");
      expect(result.path!.moves).toContain("Enable 2FA");
      expect(result.path!.moves).toContain("Opt out of data brokers");
    });

    it("path.profile is parsed correctly", () => {
      expect(result.path!.profile.worry).toBe("brokers");
      expect(result.path!.profile.friction).toBe("low");
      expect(result.path!.profile.level).toBe("beginner");
    });

    it("path.reason is parsed correctly", () => {
      expect(result.path!.reason).toBe(
        "Covers the basics for a data-broker threat model."
      );
    });

    it("text has the fenced block stripped and trimmed", () => {
      // The PATH block (```PATH\n...\n```) is removed; surrounding prose remains
      expect(result.text).not.toContain("```PATH");
      expect(result.text).not.toContain("```json");
      expect(result.text).toContain("Here is your plan.");
      expect(result.text).toContain("Good luck!");
    });

    it("text does not contain the raw JSON payload", () => {
      expect(result.text).not.toContain('"moves"');
    });
  });

  // ----------------------------------------------------------------
  // 2. Anti-hallucination gate: PATH block with fewer than 3 moves
  // ----------------------------------------------------------------
  describe("PATH block with <3 moves (anti-hallucination gate)", () => {
    const shortPath = JSON.stringify({
      profile: { worry: "person", friction: "high", level: "intermediate" },
      reason: "Only two steps identified.",
      moves: ["Use a password manager", "Enable 2FA"],
    });
    const reply = `Plan:\n\`\`\`PATH\n${shortPath}\n\`\`\``;
    const result = extractAIPath(reply);

    it("path is null when moves.length < 3", () => {
      // Anti-hallucination gate: Array.isArray(p.moves) && p.moves.length >= 3
      expect(result.path).toBeNull();
    });

    it("text has the block stripped even when the gate rejects the path", () => {
      // Code: stripped is computed before the gate; fallthrough returns { text: stripped, path: null }
      expect(result.text).not.toContain("```PATH");
      expect(result.text).not.toContain('"moves"');
    });
  });

  // ----------------------------------------------------------------
  // 3. Reply with NO PATH block
  // ----------------------------------------------------------------
  describe("reply with no PATH block", () => {
    const plain = "Here is some general privacy advice. Stay safe!";
    const result = extractAIPath(plain);

    it("path is null", () => {
      expect(result.path).toBeNull();
    });

    it("text is the original reply unchanged", () => {
      // No match → early return { text, path: null } with the ORIGINAL string
      expect(result.text).toBe(plain);
    });
  });

  // ----------------------------------------------------------------
  // 4. Malformed JSON inside a PATH block
  // ----------------------------------------------------------------
  describe("malformed JSON inside PATH block", () => {
    const reply = "Check this:\n```PATH\n{not valid json!!!}\n```";

    it("does not throw", () => {
      expect(() => extractAIPath(reply)).not.toThrow();
    });

    it("path is null", () => {
      const result = extractAIPath(reply);
      expect(result.path).toBeNull();
    });

    it("text has the malformed block stripped", () => {
      // Code strips before try/catch, so stripped text is still returned
      const result = extractAIPath(reply);
      expect(result.text).not.toContain("```PATH");
      expect(result.text).not.toContain("{not valid json!!!}");
    });
  });

  // ----------------------------------------------------------------
  // 5. Fallback regex: ```json fence with a moves array of >=3
  // ----------------------------------------------------------------
  describe("fallback regex — ```json fence with moves array >=3", () => {
    const jsonPath = JSON.stringify({
      profile: { worry: "crime", friction: "med", level: "advanced" },
      reason: "Fraud-focused hardening.",
      moves: ["Freeze credit", "Use a password manager", "Enable 2FA"],
    });
    const reply = `Your plan:\n\`\`\`json\n${jsonPath}\n\`\`\``;
    const result = extractAIPath(reply);

    it("path is non-null (fallback regex matched)", () => {
      // Second regex: /```(?:json)?\s*(\{[\s\S]*?"moves"[\s\S]*?\})\s*```/
      expect(result.path).not.toBeNull();
    });

    it("path.moves has the correct entries", () => {
      expect(result.path!.moves).toHaveLength(3);
      expect(result.path!.moves).toContain("Freeze credit");
    });

    it("path.profile.worry is 'crime'", () => {
      expect(result.path!.profile.worry).toBe("crime");
    });

    it("text has the json fence stripped", () => {
      expect(result.text).not.toContain("```json");
      expect(result.text).toContain("Your plan:");
    });
  });
});
