import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Control from "./Control";
import Legend from "./Legend";
import CostDot from "./CostDot";
import FreshStart from "./FreshStart";
import LocalOnly from "./LocalOnly";
import PrivacyBar from "./PrivacyBar";
import { BrandLogoHorizontal, BrandLogoStacked } from "./BrandLogo";
import type { PrivacyScore, PrivacyLabel } from "@/lib/score";

test("Control renders its label and children", () => {
  render(<Control label="SEARCH"><span>child-content</span></Control>);
  expect(screen.getByText("SEARCH")).toBeInTheDocument();
  expect(screen.getByText("child-content")).toBeInTheDocument();
});

test("Legend renders EDGE type labels", () => {
  render(<Legend />);
  // EDGE has these labels from data/ui-maps.ts
  expect(screen.getByText("unlocks (prerequisite)")).toBeInTheDocument();
  expect(screen.getByText("enables (synergy)")).toBeInTheDocument();
});

test("Legend renders the EDGE TYPES heading", () => {
  render(<Legend />);
  expect(screen.getByText("EDGE TYPES")).toBeInTheDocument();
});

test("Legend renders a letter for each domain", () => {
  render(<Legend />);
  // DOMAIN_LETTER has F, D, E, P, B, C, V
  for (const letter of ["F", "D", "E", "P", "B", "C", "V"]) {
    expect(screen.getAllByText(letter).length).toBeGreaterThan(0);
  }
});

test("CostDot renders the mapped value label", () => {
  render(<CostDot k="$" v="low" map={{ none: "free", low: "$", med: "$$", high: "$$$" }} />);
  expect(screen.getByText("$")).toBeInTheDocument();
});

test("FreshStart renders the invitation headline", () => {
  render(<FreshStart />);
  expect(screen.getByText("YOUR MAP STARTS HERE")).toBeInTheDocument();
});

test("LocalOnly renders the full assurance text by default", () => {
  render(<LocalOnly />);
  expect(screen.getByText(/stored privately for you alone/i)).toBeInTheDocument();
});

test("LocalOnly renders compact text when compact=true", () => {
  render(<LocalOnly compact />);
  expect(screen.getByText(/Stored privately on your side/i)).toBeInTheDocument();
});

test("PrivacyBar renders the posture label and fill percentage", () => {
  const score: PrivacyScore = {
    pct: 0.46,
    lab: "Meaningfully private",
    rawPct: 0.5,
    completed: 10,
    total: 20,
  };
  const lab: PrivacyLabel = { t: "Meaningfully private", c: "#f0c468" };
  render(<PrivacyBar score={score} lab={lab} due={0} />);
  expect(screen.getByText("YOUR PRIVACY POSTURE")).toBeInTheDocument();
  expect(screen.getByText("Meaningfully private")).toBeInTheDocument();
  expect(screen.getByText("10 of 20 moves · cap at \"hardened\"")).toBeInTheDocument();
});

test("PrivacyBar shows recheck notice when due > 0", () => {
  const score: PrivacyScore = { pct: 0.3, lab: "Getting started", rawPct: 0.33, completed: 5, total: 15 };
  const lab: PrivacyLabel = { t: "Getting started", c: "#f0a868" };
  render(<PrivacyBar score={score} lab={lab} due={2} />);
  expect(screen.getByText(/due for a re-check/i)).toBeInTheDocument();
});

test("BrandLogoHorizontal is accessible and has no bg rect", () => {
  const { container } = render(<BrandLogoHorizontal />);
  expect(screen.getByRole("img", { name: /privacy atlas/i })).toBeInTheDocument();
  // No background rect should be in the output
  expect(container.querySelector("rect[fill='#0b0e13']")).toBeNull();
});

test("BrandLogoStacked is accessible and has no bg rect", () => {
  const { container } = render(<BrandLogoStacked />);
  expect(screen.getByRole("img", { name: /privacy atlas/i })).toBeInTheDocument();
  expect(container.querySelector("rect[fill='#0b0e13']")).toBeNull();
});
