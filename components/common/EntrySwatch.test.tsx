import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import EntrySwatch from "./EntrySwatch";
import type { SearchEntry } from "@/lib/search";
const e = (over: Partial<SearchEntry>): SearchEntry => ({ key: "k", label: "L", sub: "", kind: "move", haystack: "", ...over });

describe("EntrySwatch", () => {
  it("shows the domain letter inside the swatch for a domain-coded move", () => {
    const { getByText } = render(<EntrySwatch entry={e({ swatch: "#5fd3c8", letter: "D" })} />);
    expect(getByText("D")).toBeInTheDocument();
  });
  it("renders a diamond (no letter) for a threat", () => {
    const { container, queryByText } = render(<EntrySwatch entry={e({ kind: "threat", swatch: "#ff5c5c", diamond: true })} />);
    expect(queryByText(/^[A-Z]$/)).toBeNull();
    expect(container.querySelector("span")).toBeTruthy();
  });
});
