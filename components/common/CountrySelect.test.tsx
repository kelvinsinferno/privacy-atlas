import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CountrySelect from "./CountrySelect";

describe("CountrySelect", () => {
  it("renders a placeholder + country options and reports the chosen code", () => {
    const onChange = vi.fn();
    render(<CountrySelect value="" onChange={onChange} placeholder="— your country —" />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(screen.getByRole("option", { name: "— your country —" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Germany/ })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "DE" } });
    expect(onChange).toHaveBeenCalledWith("DE");
  });
  it("reflects the selected value", () => {
    render(<CountrySelect value="GB" onChange={vi.fn()} />);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("GB");
  });
  it("reports empty string when the placeholder is reselected", () => {
    const onChange = vi.fn();
    render(<CountrySelect value="DE" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });
});
