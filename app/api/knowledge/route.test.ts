import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/knowledge", () => {
  it("returns a Response object", () => {
    const res = GET();
    expect(res).toBeInstanceOf(Response);
  });

  it("response JSON has a nodes array", async () => {
    const res = GET();
    const data = await res.json();
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(data.nodes.length).toBeGreaterThan(0);
  });

  it("response JSON has a threats array", async () => {
    const res = GET();
    const data = await res.json();
    expect(Array.isArray(data.threats)).toBe(true);
    expect(data.threats.length).toBeGreaterThan(0);
  });

  it("response JSON has project === 'Privacy Atlas'", async () => {
    const res = GET();
    const data = await res.json();
    expect(data.project).toBe("Privacy Atlas");
  });

  it("response JSON has edges array", async () => {
    const res = GET();
    const data = await res.json();
    expect(Array.isArray(data.edges)).toBe(true);
    expect(data.edges.length).toBeGreaterThan(0);
  });

  it("response JSON has journeys array", async () => {
    const res = GET();
    const data = await res.json();
    expect(Array.isArray(data.journeys)).toBe(true);
    expect(data.journeys.length).toBeGreaterThan(0);
  });

  it("SECURITY: serialized JSON contains NO journeyProgress key", async () => {
    const res = GET();
    const raw = await res.text();
    expect(raw).not.toContain('"journeyProgress"');
  });

  it("SECURITY: serialized JSON contains NO profile key", async () => {
    const res = GET();
    const raw = await res.text();
    expect(raw).not.toContain('"profile"');
  });

  it("SECURITY: serialized JSON contains NO devices key", async () => {
    const res = GET();
    const raw = await res.text();
    expect(raw).not.toContain('"devices"');
  });

  it("SECURITY: serialized JSON contains NO contributions key", async () => {
    const res = GET();
    const raw = await res.text();
    expect(raw).not.toContain('"contributions"');
  });

  it("CORS header Access-Control-Allow-Origin is *", () => {
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
