import { describe, it, expect } from "vitest";
import { toastHeadline, toastBody } from "../lib/toast-copy";
import type { ToastPayload } from "../lib/types";

const base: ToastPayload = {
  threatId: "T-FINGERPRINT", threatLabel: "Browser fingerprinting", leakClass: "fingerprinting",
  mode: "adopt", deepLink: "https://privacyatlas.xyz/?threat=T-FINGERPRINT",
  moves: [{ id: "m1", label: "Use a fingerprint-resistant browser", summary: "s", domain: "digital" }],
};

describe("toast copy", () => {
  it("adopt headline names the threat", () => {
    expect(toastHeadline(base)).toContain("Browser fingerprinting");
  });
  it("adopt body teaches the move", () => {
    expect(toastBody(base)).toContain("Use a fingerprint-resistant browser");
  });
  it("apply body is an affirming reminder, not a teach", () => {
    const body = toastBody({ ...base, mode: "apply" });
    expect(body.toLowerCase()).toMatch(/you|use/);
    expect(body).toContain("Use a fingerprint-resistant browser");
  });
});
