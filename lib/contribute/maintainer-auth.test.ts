import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireMaintainer } from "./maintainer-auth";

const req = (auth?: string) => new Request("http://x", auth ? { headers: { authorization: auth } } : {});

describe("requireMaintainer", () => {
  const orig = process.env.MAINTAINER_API_KEY;
  beforeEach(() => { process.env.MAINTAINER_API_KEY = "s3cret-key-value"; });
  afterEach(() => { if (orig === undefined) delete process.env.MAINTAINER_API_KEY; else process.env.MAINTAINER_API_KEY = orig; });

  it("accepts the exact bearer key", () => {
    expect(requireMaintainer(req("Bearer s3cret-key-value"))).toEqual({ ok: true });
  });
  it("rejects a wrong key with 401", () => {
    const r = requireMaintainer(req("Bearer wrong"));
    expect("error" in r && r.error.status).toBe(401);
  });
  it("rejects a missing header with 401", () => {
    const r = requireMaintainer(req());
    expect("error" in r && r.error.status).toBe(401);
  });
  it("rejects a non-Bearer scheme with 401", () => {
    const r = requireMaintainer(req("Basic s3cret-key-value"));
    expect("error" in r && r.error.status).toBe(401);
  });
  it("returns 503 when MAINTAINER_API_KEY is unset (never falls open)", () => {
    delete process.env.MAINTAINER_API_KEY;
    const r = requireMaintainer(req("Bearer anything"));
    expect("error" in r && r.error.status).toBe(503);
  });
});
