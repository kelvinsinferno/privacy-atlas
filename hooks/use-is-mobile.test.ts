import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./use-is-mobile";

interface MockMql {
  matches: boolean;
  addEventListener: (_: string, cb: () => void) => void;
  removeEventListener: (_: string, cb: () => void) => void;
  _fire: (v: boolean) => void;
}

function mockMatchMedia(matches: boolean): MockMql {
  const listeners = new Set<() => void>();
  const mql: MockMql = {
    matches,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    _fire(v: boolean) {
      mql.matches = v;
      listeners.forEach((c) => c());
    },
  };
  (window as Window & { matchMedia: unknown }).matchMedia = vi.fn().mockReturnValue(mql);
  return mql;
}
beforeEach(() => vi.restoreAllMocks());

describe("useIsMobile", () => {
  it("reflects the initial match", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
  it("is false for a wide viewport", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
  it("updates on a media-query change", () => {
    const mql = mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => mql._fire(true));
    expect(result.current).toBe(true);
  });
});
