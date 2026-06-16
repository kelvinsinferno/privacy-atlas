import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileEntryList from "./MobileEntryList";
import type { SearchEntry } from "@/lib/search";

const entry = (over: Partial<SearchEntry> = {}): SearchEntry => ({
  key: "k1", label: "Use a password manager", sub: "move · foundation", kind: "move",
  swatch: "#5fd3c8", nodeId: "password-manager", haystack: "use a password manager", ...over,
});

describe("MobileEntryList", () => {
  it("renders a row per entry with its label", () => {
    render(<MobileEntryList entries={[entry(), entry({ key: "k2", label: "Data-broker economy", kind: "threat", diamond: true, nodeId: "T-BROKER" })]} onPick={vi.fn()} />);
    expect(screen.getByText("Use a password manager")).toBeInTheDocument();
    expect(screen.getByText("Data-broker economy")).toBeInTheDocument();
  });
  it("calls onPick with the entry when a row is tapped", () => {
    const onPick = vi.fn();
    render(<MobileEntryList entries={[entry()]} onPick={onPick} />);
    fireEvent.click(screen.getByText("Use a password manager"));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ nodeId: "password-manager" }));
  });
  it("shows an empty state when there are no entries", () => {
    render(<MobileEntryList entries={[]} onPick={vi.fn()} />);
    expect(screen.getByText(/no moves or threats match/i)).toBeInTheDocument();
  });
});
