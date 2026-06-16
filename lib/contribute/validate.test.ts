import { describe, it, expect } from "vitest";
import { validatePayload } from "./validate";

describe("validatePayload", () => {
  it("accepts a minimal valid move proposal", () => {
    const r = validatePayload({ nodeKind: "move", label: "Use a faraday bag" });
    expect(r.ok).toBe(true);
  });
  it("accepts a full proposal with sources + rel", () => {
    const r = validatePayload({ nodeKind: "threat", label: "X", domain: "digital", summary: "s", honesty: "h", rel: ["a", "b"], src: { url: "https://e.com", title: "E" } });
    expect(r.ok).toBe(true);
  });
  it("rejects a bad nodeKind", () => {
    expect(validatePayload({ nodeKind: "node", label: "x" }).ok).toBe(false);
  });
  it("rejects a missing/empty label", () => {
    expect(validatePayload({ nodeKind: "move" }).ok).toBe(false);
    expect(validatePayload({ nodeKind: "move", label: "" }).ok).toBe(false);
  });
  it("rejects an over-long label", () => {
    expect(validatePayload({ nodeKind: "move", label: "x".repeat(200) }).ok).toBe(false);
  });
  it("rejects a non-https source url", () => {
    expect(validatePayload({ nodeKind: "move", label: "x", src: { url: "javascript:alert(1)" } }).ok).toBe(false);
  });
  it("returns the cleaned (trimmed) payload on success", () => {
    const r = validatePayload({ nodeKind: "move", label: "  Trim me  " });
    expect(r.ok && r.kind === "node" && r.value.label).toBe("Trim me");
  });
});

describe("validatePayload — howto", () => {
  const ok = { kind: "howto", targetId: "password-manager", platform: "iOS", steps: ["open settings", "enable it"] };
  it("accepts a valid howto + reports kind", () => {
    const r = validatePayload(ok);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.kind).toBe("howto"); expect(r.value).toMatchObject({ kind: "howto", targetId: "password-manager", platform: "iOS" }); }
  });
  it("rejects a howto with no steps", () => { expect(validatePayload({ ...ok, steps: [] }).ok).toBe(false); });
  it("rejects a non-https howto src", () => { expect(validatePayload({ ...ok, src: { url: "http://x.com" } }).ok).toBe(false); });
  it("still validates a node payload + reports kind node", () => {
    const r = validatePayload({ nodeKind: "move", label: "L" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.kind).toBe("node");
  });
});

describe("validatePayload — resource + source", () => {
  const res = { kind: "resource", targetId: "device-disposal", name: "ShredOS", url: "https://x.org/s", resourceType: "link" };
  it("accepts a resource + reports kind", () => {
    const r = validatePayload(res);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.kind).toBe("resource"); expect(r.value).toMatchObject({ kind: "resource", name: "ShredOS", resourceType: "link" }); }
  });
  it("STRIPS any client-supplied affiliate/reviewMeta/commercial", () => {
    const r = validatePayload({ ...res, affiliate: { hasProgram: true }, reviewMeta: { commercial: true }, commercial: true });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value).not.toHaveProperty("affiliate"); expect(r.value).not.toHaveProperty("reviewMeta"); expect(r.value).not.toHaveProperty("commercial"); }
  });
  it("rejects a non-https resource url + a bad resourceType", () => {
    expect(validatePayload({ ...res, url: "http://x.org" }).ok).toBe(false);
    expect(validatePayload({ ...res, resourceType: "sneaky" }).ok).toBe(false);
  });
  it("accepts a source + reports kind", () => {
    const r = validatePayload({ kind: "source", targetId: "T-BROKER", title: "EFF", url: "https://eff.org/x", sourceKind: "org" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.kind).toBe("source");
  });
});

describe("validatePayload — region", () => {
  const base = { kind: "region", targetId: "credit-freeze-big3", country: "DE", status: "different" };
  it("accepts a minimal valid region (status + country + targetId)", () => {
    const r = validatePayload(base);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.kind).toBe("region"); expect((r.value as { country: string }).country).toBe("DE"); }
  });
  it("accepts a full region with note/steps/law/src", () => {
    const r = validatePayload({ ...base, note: "Use SCHUFA.", steps: ["Contact SCHUFA"], law: { name: "BDSG", ref: "§1" }, src: { url: "https://www.schufa.de", title: "SCHUFA" } });
    expect(r.ok).toBe(true);
  });
  it("rejects an unknown country code", () => {
    expect(validatePayload({ ...base, country: "ZZ" }).ok).toBe(false);
    expect(validatePayload({ ...base, country: "de" }).ok).toBe(false);
  });
  it("rejects an invalid status", () => {
    expect(validatePayload({ ...base, status: "maybe" }).ok).toBe(false);
  });
  it("rejects a non-https src url", () => {
    expect(validatePayload({ ...base, src: { url: "http://insecure.example" } }).ok).toBe(false);
  });
  it("rejects a missing targetId", () => {
    expect(validatePayload({ kind: "region", country: "DE", status: "applies" }).ok).toBe(false);
  });
});
