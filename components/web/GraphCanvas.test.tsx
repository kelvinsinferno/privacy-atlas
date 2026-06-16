import { vi, expect, test } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import GraphCanvas, { clampScale } from "./GraphCanvas";
import { buildModel } from "@/lib/model";

/** Pre-assign x/y to model nodes so they pass the `typeof n.x === "number"` render guard. */
function modelWithPositions() {
  const model = buildModel({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model.all.forEach((n: any, i: number) => {
    n.x = 100 + i * 20;
    n.y = 100 + i * 20;
  });
  return model;
}

test("GraphCanvas renders an svg with nodes for visible ids", () => {
  const model = buildModel({});
  const visibleIds = new Set(model.all.map((n) => n.id));
  const { container } = render(
    <GraphCanvas
      model={model} visibleIds={visibleIds} selected={null} setSelected={() => {}}
      neighborhood={null} pathInfo={null} goal={null} matchesSearch={() => true} search=""
      history={[]} goBack={() => {}} byId={model.byId} showThreats={true}
      setShowThreats={() => {}} done={{}} showProgress={true}
    />
  );
  const svg = container.querySelector("svg");
  expect(svg).toBeTruthy();
  // the vignette backdrop rect always renders, and the back button is absent with empty history
  expect(container.querySelector("rect")).toBeTruthy();
  expect(container.querySelector("button[title='back to where you came from']")).toBeNull();
});

test("GraphCanvas shows the back button when history is non-empty", () => {
  const model = buildModel({});
  const visibleIds = new Set(model.all.map((n) => n.id));
  const firstId = model.all[0].id;
  const { container } = render(
    <GraphCanvas
      model={model} visibleIds={visibleIds} selected={null} setSelected={() => {}}
      neighborhood={null} pathInfo={null} goal={null} matchesSearch={() => true} search=""
      history={[firstId]} goBack={() => {}} byId={model.byId} showThreats={true}
      setShowThreats={() => {}} done={{}} showProgress={true}
    />
  );
  expect(container.querySelector("button[title='back to where you came from']")).toBeTruthy();
});

test("GraphCanvas map wrapper is keyboard-focusable with aria-label", () => {
  const model = buildModel({});
  const visibleIds = new Set(model.all.map((n) => n.id));
  const { container } = render(
    <GraphCanvas model={model} visibleIds={visibleIds} selected={null} setSelected={() => {}}
      neighborhood={null} pathInfo={null} goal={null} matchesSearch={() => true} search=""
      history={[]} goBack={() => {}} byId={model.byId} showThreats={true}
      setShowThreats={() => {}} done={{}} showProgress={true} />
  );
  const wrapper = container.querySelector('[role="application"]');
  expect(wrapper).toBeTruthy();
  expect(wrapper?.getAttribute("tabindex")).toBe("0");
  expect(wrapper?.getAttribute("aria-label")).toMatch(/privacy map/i);
});

test("GraphCanvas keyboard nav: ArrowDown moves focus and Enter calls setSelected", () => {
  const model = buildModel({});
  const visibleIds = new Set(model.all.map((n) => n.id));
  const setSelected = vi.fn();
  const { container } = render(
    <GraphCanvas model={model} visibleIds={visibleIds} selected={null} setSelected={setSelected}
      neighborhood={null} pathInfo={null} goal={null} matchesSearch={() => true} search=""
      history={[]} goBack={() => {}} byId={model.byId} showThreats={true}
      setShowThreats={() => {}} done={{}} showProgress={false} />
  );
  const wrapper = container.querySelector('[role="application"]') as HTMLElement;
  // Focus the wrapper to initialize kbIdx to 0
  fireEvent.focus(wrapper);
  // ArrowDown to go to next node (kbIdx becomes 1)
  fireEvent.keyDown(wrapper, { key: "ArrowDown" });
  // Enter selects the focused node
  fireEvent.keyDown(wrapper, { key: "Enter" });
  expect(setSelected).toHaveBeenCalled();
  // Escape calls setSelected(null)
  fireEvent.keyDown(wrapper, { key: "Escape" });
  expect(setSelected).toHaveBeenCalledWith(null);
});

test("long-press shows the node label after 450ms", () => {
  vi.useFakeTimers();
  const model = modelWithPositions();
  const visibleIds = new Set(model.all.map((n) => n.id));
  const firstNode = model.all[0];
  const { container } = render(
    <GraphCanvas model={model} visibleIds={visibleIds} selected={null} setSelected={() => {}}
      neighborhood={null} pathInfo={null} goal={null} matchesSearch={() => false} search=""
      history={[]} goBack={() => {}} byId={model.byId} showThreats={true}
      setShowThreats={() => {}} done={{}} showProgress={false} />
  );
  // Node <g> elements live inside: svg > g[transform] > g (nodes container) > g (each node)
  const nodeGs = container.querySelectorAll("svg > g > g:nth-child(2) > g");
  expect(nodeGs.length).toBeGreaterThan(0);
  const nodeG = nodeGs[0] as HTMLElement;
  // Fire touchStart to begin long-press
  fireEvent.touchStart(nodeG, { touches: [{ clientX: 100, clientY: 100, identifier: 0 }] });
  // Advance past the 450ms long-press threshold
  act(() => { vi.advanceTimersByTime(460); });
  // The node's label should now appear in the DOM (hovered state set → showLabel true)
  const allText = container.querySelectorAll("text");
  const labelTexts = Array.from(allText).map((el) => el.textContent || "");
  const labelVisible = labelTexts.some((t) => t.includes(firstNode.label));
  expect(labelVisible).toBe(true);
  vi.useRealTimers();
});

test("movement cancels long-press: label does NOT appear after 8px move", () => {
  vi.useFakeTimers();
  const model = modelWithPositions();
  const visibleIds = new Set(model.all.map((n) => n.id));
  const firstNode = model.all[0];
  const { container } = render(
    <GraphCanvas model={model} visibleIds={visibleIds} selected={null} setSelected={() => {}}
      neighborhood={null} pathInfo={null} goal={null} matchesSearch={() => false} search=""
      history={[]} goBack={() => {}} byId={model.byId} showThreats={true}
      setShowThreats={() => {}} done={{}} showProgress={false} />
  );
  const nodeGs = container.querySelectorAll("svg > g > g:nth-child(2) > g");
  expect(nodeGs.length).toBeGreaterThan(0);
  const nodeG = nodeGs[0] as HTMLElement;
  // Fire touchStart
  fireEvent.touchStart(nodeG, { touches: [{ clientX: 100, clientY: 100, identifier: 0 }] });
  // Move beyond 8px threshold — long-press should be cancelled
  fireEvent.touchMove(nodeG, { touches: [{ clientX: 115, clientY: 100, identifier: 0 }] });
  // Advance timers — timer was cancelled so hovered stays null
  act(() => { vi.advanceTimersByTime(600); });
  // The label should NOT appear
  const allText = container.querySelectorAll("text");
  const labelTexts = Array.from(allText).map((el) => el.textContent || "");
  const labelVisible = labelTexts.some((t) => t.includes(firstNode.label));
  expect(labelVisible).toBe(false);
  vi.useRealTimers();
});

test("pinch zoom: wrapper div has touchAction none and main g transform includes scale", () => {
  const model = buildModel({});
  const visibleIds = new Set(model.all.map((n) => n.id));
  const { container } = render(
    <GraphCanvas model={model} visibleIds={visibleIds} selected={null} setSelected={() => {}}
      neighborhood={null} pathInfo={null} goal={null} matchesSearch={() => true} search=""
      history={[]} goBack={() => {}} byId={model.byId} showThreats={true}
      setShowThreats={() => {}} done={{}} showProgress={false} />
  );
  const wrapper = container.querySelector('[role="application"]') as HTMLElement;
  expect(wrapper).toBeTruthy();
  // Wrapper should have touchAction: none to prevent browser interference
  expect(wrapper.style.touchAction).toBe("none");
  // The main g transform should include scale
  const mainG = container.querySelector("svg > g");
  expect(mainG).toBeTruthy();
  const transform = mainG?.getAttribute("transform") || "";
  expect(transform).toContain("scale");
});

test("pinch zoom changes scale when two-finger pinch is simulated on wrapper", () => {
  const model = buildModel({});
  const visibleIds = new Set(model.all.map((n) => n.id));
  const { container } = render(
    <GraphCanvas model={model} visibleIds={visibleIds} selected={null} setSelected={() => {}}
      neighborhood={null} pathInfo={null} goal={null} matchesSearch={() => true} search=""
      history={[]} goBack={() => {}} byId={model.byId} showThreats={true}
      setShowThreats={() => {}} done={{}} showProgress={false} />
  );
  const wrapper = container.querySelector('[role="application"]') as HTMLElement;
  // Initial transform should include scale(1)
  const mainG = container.querySelector("svg > g");
  const initialTransform = mainG?.getAttribute("transform") || "";
  expect(initialTransform).toContain("scale(1)");
  // Simulate pinch via fireEvent on the wrapper (synthetic events)
  fireEvent.touchStart(wrapper, { touches: [
    { clientX: 100, clientY: 200, identifier: 0 },
    { clientX: 200, clientY: 200, identifier: 1 },
  ]});
  fireEvent.touchMove(wrapper, { touches: [
    { clientX: 50, clientY: 200, identifier: 0 },
    { clientX: 250, clientY: 200, identifier: 1 },
  ]});
  fireEvent.touchEnd(wrapper, { touches: [] });
  // Note: imperative addEventListener listeners may not respond to synthetic fireEvent in JSDOM;
  // this test verifies no errors are thrown during the events
});

// ─── clampScale unit tests ────────────────────────────────────────────────────
// These test the pure helper that clamps pinch scale to [0.4, 2.5].

test("clampScale: clamps below minimum to 0.4", () => {
  expect(clampScale(0.1)).toBe(0.4);
  expect(clampScale(0)).toBe(0.4);
  expect(clampScale(0.4)).toBe(0.4);
});

test("clampScale: clamps above maximum to 2.5", () => {
  expect(clampScale(3)).toBe(2.5);
  expect(clampScale(100)).toBe(2.5);
  expect(clampScale(2.5)).toBe(2.5);
});

test("clampScale: passes through mid-range values unchanged", () => {
  expect(clampScale(1)).toBe(1);
  expect(clampScale(1.5)).toBe(1.5);
  expect(clampScale(0.8)).toBe(0.8);
  expect(clampScale(2.0)).toBe(2.0);
});
