import { describe, it, expect, vi, beforeEach } from "vitest";
import { installFpHook } from "../entrypoints/fp-hook";

beforeEach(() => { vi.restoreAllMocks(); });

describe("installFpHook", () => {
  it("posts a signal when canvas.toDataURL is called", () => {
    const posted: { __atlasLens: true; api: string }[] = [];
    const post = (m: { __atlasLens: true; api: string }) => posted.push(m);
    const canvasProto = { toDataURL: () => "data:," } as { toDataURL: (...a: unknown[]) => unknown };
    installFpHook({ canvasProto, post });
    canvasProto.toDataURL();
    expect(posted).toEqual([{ __atlasLens: true, api: "canvas.toDataURL" }]);
  });
  it("only signals once per api even if called repeatedly", () => {
    const posted: { __atlasLens: true; api: string }[] = [];
    const canvasProto = { toDataURL: () => "x" } as { toDataURL: (...a: unknown[]) => unknown };
    installFpHook({ canvasProto, post: (m) => posted.push(m) });
    canvasProto.toDataURL(); canvasProto.toDataURL();
    expect(posted).toHaveLength(1);
  });
  it("preserves the original return value", () => {
    const canvasProto = { toDataURL: () => "ORIGINAL" } as { toDataURL: (...a: unknown[]) => unknown };
    installFpHook({ canvasProto, post: () => {} });
    expect(canvasProto.toDataURL()).toBe("ORIGINAL");
  });

  it("signals canvas.getImageData and preserves return", () => {
    const posted: { api: string }[] = [];
    const ctx2dProto = { getImageData: () => "PIXELS" } as { getImageData: (...a: unknown[]) => unknown };
    const canvasProto = { toDataURL: () => "x" } as { toDataURL: (...a: unknown[]) => unknown };
    installFpHook({ canvasProto, ctx2dProto, post: (m) => posted.push(m) });
    expect(ctx2dProto.getImageData()).toBe("PIXELS");
    expect(posted.some((p) => p.api === "canvas.getImageData")).toBe(true);
  });

  it("signals webgl.getParameter only for UNMASKED params", () => {
    const posted: { api: string }[] = [];
    const canvasProto = { toDataURL: () => "x" } as { toDataURL: (...a: unknown[]) => unknown };
    const gl = { getParameter: (p: number) => "VAL:" + p } as { getParameter: (...a: unknown[]) => unknown };
    installFpHook({ canvasProto, webglProtos: [gl], post: (m) => posted.push(m) });
    expect(gl.getParameter(3379)).toBe("VAL:3379");            // non-unmasked → no signal
    expect(posted.some((p) => p.api === "webgl.getParameter")).toBe(false);
    expect(gl.getParameter(37446)).toBe("VAL:37446");           // UNMASKED_RENDERER → signal
    expect(posted.some((p) => p.api === "webgl.getParameter")).toBe(true);
  });
});
