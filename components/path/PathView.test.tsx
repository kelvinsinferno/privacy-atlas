import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PathView from "./PathView";
import { buildModel } from "@/lib/model";

const model = buildModel({});
const base = {
  path: [],
  onExplore: vi.fn(),
  onStart: vi.fn(),
  aiPath: null,
  onClearAIPath: vi.fn(),
  model,
  done: {} as Record<string, number | boolean>,
};

describe("PathView — device-age banner", () => {
  it("shows the at-risk banner and links to update-discipline", () => {
    const setSelected = vi.fn();
    render(<PathView {...base} setSelected={setSelected} profile={{ worry: "broad", friction: "med", level: "beginner", phoneAge: "4plus" }} />);
    expect(screen.getByText(/may no longer get security updates/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Keep everything updated/i));
    expect(setSelected).toHaveBeenCalledWith("update-discipline");
  });

  it("does not show the banner for a current phone", () => {
    render(<PathView {...base} setSelected={vi.fn()} profile={{ worry: "broad", friction: "med", level: "beginner", phoneAge: "lt2" }} />);
    expect(screen.queryByText(/security updates/i)).toBeNull();
  });

  it("dismisses the banner", () => {
    render(<PathView {...base} setSelected={vi.fn()} profile={{ worry: "broad", friction: "med", level: "beginner", phoneAge: "4plus" }} />);
    fireEvent.click(screen.getByLabelText("dismiss"));
    expect(screen.queryByText(/may no longer get security updates/i)).toBeNull();
  });

  it("shows the uncertain banner for an unknown phone age and links to update-discipline", () => {
    const setSelected = vi.fn();
    render(<PathView {...base} setSelected={setSelected} profile={{ worry: "broad", friction: "med", level: "beginner", phoneAge: "unknown" }} />);
    expect(screen.getByText(/Not sure how old your phone is/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Keep everything updated/i));
    expect(setSelected).toHaveBeenCalledWith("update-discipline");
  });
});
