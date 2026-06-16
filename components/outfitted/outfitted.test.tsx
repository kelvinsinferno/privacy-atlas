import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OutfittedView from "./OutfittedView";
import { buildModel } from "@/lib/model";
import { PERSONAS, KIT_CATEGORIES, KIT_ICONS } from "@/data/personas";

// ── OutfittedView smoke tests ────────────────────────────────────────────────

const model = buildModel({});

test("renders a known persona name", () => {
  const onInspect = vi.fn();
  render(<OutfittedView model={model} onInspect={onInspect} />);
  // PERSONAS[0] is "The Traveler"
  expect(screen.getByText(PERSONAS[0].name)).toBeInTheDocument();
});

test("renders all persona names", () => {
  const onInspect = vi.fn();
  render(<OutfittedView model={model} onInspect={onInspect} />);
  for (const p of PERSONAS) {
    expect(screen.getByText(p.name)).toBeInTheDocument();
  }
});

test("renders at least one SVG icon", () => {
  const onInspect = vi.fn();
  const { container } = render(<OutfittedView model={model} onInspect={onInspect} />);
  const svgs = container.querySelectorAll("svg");
  expect(svgs.length).toBeGreaterThan(0);
});

test("renders kit category labels (Eyewear, Apparel, Bags & Carry, Devices, Off-grid Comms)", () => {
  const onInspect = vi.fn();
  render(<OutfittedView model={model} onInspect={onInspect} />);
  for (const cat of KIT_CATEGORIES) {
    expect(screen.getByText(cat.name)).toBeInTheDocument();
  }
});

test("clicking a persona card expands the full kit", () => {
  const onInspect = vi.fn();
  render(<OutfittedView model={model} onInspect={onInspect} />);
  // Click the first persona card button (The Traveler)
  const cardBtn = screen.getByText(PERSONAS[0].name).closest("button")!;
  fireEvent.click(cardBtn);
  // After expanding, the "the full kit" text should appear
  expect(screen.getByText(/the full kit/)).toBeInTheDocument();
});

test("opening a look scrolls its full-kit sheet into view (so it isn't lost below the fold)", () => {
  // jsdom doesn't implement scrollIntoView; spy on it to prove the auto-scroll fires.
  const scrollSpy = vi.fn();
  const orig = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = scrollSpy;
  try {
    const onInspect = vi.fn();
    render(<OutfittedView model={model} onInspect={onInspect} />);
    fireEvent.click(screen.getByText(PERSONAS[0].name).closest("button")!);
    expect(screen.getByText(/the full kit/)).toBeInTheDocument();
    expect(scrollSpy).toHaveBeenCalled();
  } finally {
    Element.prototype.scrollIntoView = orig;
  }
});

test("clicking a kit item in the expanded look calls onInspect", () => {
  const onInspect = vi.fn();
  const { container } = render(<OutfittedView model={model} onInspect={onInspect} />);
  // Open The Traveler look
  const cardBtn = screen.getByText(PERSONAS[0].name).closest("button")!;
  fireEvent.click(cardBtn);
  // The look sheet renders look cards as divs with onClick; pick the first one
  // Look cards are inside a grid — they have "cursor: pointer" or we can find them
  // by the lookCard class-equivalent (they're plain divs with style)
  // We'll find all divs with onClick in the document and pick one that's
  // inside the lookSheet area. The lookSheet is the expanded panel that appeared.
  // Simplest: find all clickable elements that appeared after clicking persona
  const lookCardDivs = Array.from(container.querySelectorAll("div[style*='cursor']")).filter(
    (el) => (el as HTMLElement).style.cursor === "pointer"
  );
  expect(lookCardDivs.length).toBeGreaterThan(0);
  fireEvent.click(lookCardDivs[0]);
  expect(onInspect).toHaveBeenCalled();
});

// ── IconFrame gradient-id uniqueness test ────────────────────────────────────
// IconFrame is an internal function in personas.tsx; KIT_ICONS wraps it.
// Render two KIT_ICONS entries with the SAME accent color and assert
// their linearGradient ids are distinct — this is what the useId fix ensures.

test("two IconFrame instances with the same accent get distinct gradient ids (separate renders)", () => {
  const accent = "#5fd3c8";
  const { container: c1 } = render(<>{KIT_ICONS["privacy-eyewear"](accent)}</>);
  const { container: c2 } = render(<>{KIT_ICONS["anti-facial-recognition"](accent)}</>);

  const grad1 = c1.querySelector("linearGradient");
  const grad2 = c2.querySelector("linearGradient");

  expect(grad1).not.toBeNull();
  expect(grad2).not.toBeNull();
  expect(grad1!.id).not.toBe("");
  expect(grad2!.id).not.toBe("");
  expect(grad1!.id).not.toBe(grad2!.id);
});

test("two IconFrame instances with the same accent in the same render tree get distinct gradient ids", () => {
  const accent = "#5fd3c8";
  const { container } = render(
    <>
      {KIT_ICONS["privacy-eyewear"](accent)}
      {KIT_ICONS["signal-blocking-edc"](accent)}
    </>
  );
  const grads = container.querySelectorAll("linearGradient");
  // Each IconFrame produces exactly one linearGradient
  expect(grads.length).toBe(2);
  expect(grads[0].id).not.toBe("");
  expect(grads[1].id).not.toBe("");
  expect(grads[0].id).not.toBe(grads[1].id);
});
