import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /llms.txt", () => {
  it("returns a Response object", async () => {
    const res = GET();
    expect(res).toBeInstanceOf(Response);
  });

  it("body text starts with '# Privacy Atlas'", async () => {
    const res = GET();
    const text = await res.text();
    expect(text.startsWith("# Privacy Atlas")).toBe(true);
  });

  it("body contains llms.txt style marker", async () => {
    const res = GET();
    const text = await res.text();
    expect(text).toContain("machine-readable index (llms.txt style)");
  });

  it("Content-Type is text/plain", () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);
  });

  it("body contains ## Moves section", async () => {
    const res = GET();
    const text = await res.text();
    expect(text).toContain("## Moves");
  });

  it("body contains ## Threats section", async () => {
    const res = GET();
    const text = await res.text();
    expect(text).toContain("## Threats");
  });

  it("body contains no user-data keys (journeyProgress, profile, devices, contributions)", async () => {
    const res = GET();
    const text = await res.text();
    // Check that user-data schema keys don't appear; use bare camelCase for keys
    // that are unlikely to appear in graph prose, and JSON-key patterns for words
    // that coincide with natural-language usage in node summaries.
    expect(text).not.toContain("journeyProgress");
    expect(text).not.toContain('"profile":');
    expect(text).not.toContain('"devices":');
    expect(text).not.toContain("contributions");
  });
});
