import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Onboarding from "./Onboarding";
import { WORRY } from "@/data/ui-maps";

describe("Onboarding — phone-age step", () => {
  it("collects phoneAge and returns it in the onDone profile", () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} onSkip={vi.fn()} />);

    // Step 1 — worry (first option), Step 2 — friction, Step 3 — level
    fireEvent.click(screen.getByText(Object.values(WORRY)[0]!.label));
    fireEvent.click(screen.getByText("next →"));
    fireEvent.click(screen.getByText("Just the essentials"));
    fireEvent.click(screen.getByText("next →"));
    fireEvent.click(screen.getByText("Total beginner"));
    fireEvent.click(screen.getByText("next →"));

    // Step 4 — phone age (the new step)
    expect(screen.getByText(/How old is your main phone/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("4+ years"));
    fireEvent.click(screen.getByText("next →"));

    // Step 5 — country (a select; optional)
    expect(screen.getByText(/Where are you/i)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "DE" } });
    fireEvent.click(screen.getByRole("button", { name: /build my path/i }));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0]).toEqual(expect.objectContaining({ phoneAge: "4plus", country: "DE" }));
  });

  it("allows skipping the country (proceeds with country null)", () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText(Object.values(WORRY)[0]!.label));
    fireEvent.click(screen.getByText("next →"));
    fireEvent.click(screen.getByText("Just the essentials"));
    fireEvent.click(screen.getByText("next →"));
    fireEvent.click(screen.getByText("Total beginner"));
    fireEvent.click(screen.getByText("next →"));
    fireEvent.click(screen.getByText("4+ years"));
    fireEvent.click(screen.getByText("next →"));
    // do NOT pick a country
    fireEvent.click(screen.getByRole("button", { name: /build my path/i }));
    expect(onDone.mock.calls[0]![0]).toEqual(expect.objectContaining({ country: null }));
  });
});
