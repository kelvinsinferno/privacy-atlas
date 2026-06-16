import "@testing-library/jest-dom/vitest";

/* jsdom lacks ResizeObserver (used by GraphCanvas to track its container size).
   Provide a no-op stub so components that observe size mount cleanly in tests. */
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/* jsdom lacks matchMedia (used by useIsMobile). Default to a no-match (desktop)
   stub so components mount cleanly; hook-specific tests override it per-case. */
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  })) as unknown as typeof window.matchMedia;
}
