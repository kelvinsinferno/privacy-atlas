import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MachineAccess from "./MachineAccess";

// ---------------------------------------------------------------------------
// Mock clipboard — jsdom doesn't implement navigator.clipboard
// ---------------------------------------------------------------------------
beforeAll(() => {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

describe("MachineAccess — initial render", () => {
  it("renders the AI & MACHINE ACCESS section label", () => {
    render(<MachineAccess />);
    expect(screen.getByText(/AI & MACHINE ACCESS/i)).toBeInTheDocument();
  });

  it("renders the 'full JSON knowledge base' button", () => {
    render(<MachineAccess />);
    expect(
      screen.getByRole("button", { name: /full JSON knowledge base/i })
    ).toBeInTheDocument();
  });

  it("renders the 'llms.txt (markdown index)' button", () => {
    render(<MachineAccess />);
    expect(
      screen.getByRole("button", { name: /llms\.txt \(markdown index\)/i })
    ).toBeInTheDocument();
  });

  it("does NOT render a copy button initially (nothing is shown yet)", () => {
    render(<MachineAccess />);
    expect(screen.queryByRole("button", { name: /^copy$/i })).not.toBeInTheDocument();
  });

  it("does NOT render a textarea initially", () => {
    const { container } = render(<MachineAccess />);
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("renders the machine-access description text", () => {
    render(<MachineAccess />);
    expect(screen.getByText(/Built to be read by machines as well as people/i)).toBeInTheDocument();
  });
});

describe("MachineAccess — JSON toggle", () => {
  it("clicking 'full JSON knowledge base' shows a textarea with JSON content", async () => {
    const user = userEvent.setup();
    const { container } = render(<MachineAccess />);

    await user.click(screen.getByRole("button", { name: /full JSON knowledge base/i }));

    const ta = container.querySelector("textarea");
    expect(ta).not.toBeNull();
    expect(ta!.value).toContain("Privacy Atlas");
    expect(ta!.value).toContain('"nodes"');
    expect(ta!.value).toContain('"threats"');
  });

  it("clicking again hides the textarea (toggle off)", async () => {
    const user = userEvent.setup();
    const { container } = render(<MachineAccess />);

    await user.click(screen.getByRole("button", { name: /full JSON knowledge base/i }));
    expect(container.querySelector("textarea")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /^hide$/i }));
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("copy button appears when JSON is shown", async () => {
    const user = userEvent.setup();
    render(<MachineAccess />);

    await user.click(screen.getByRole("button", { name: /full JSON knowledge base/i }));
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeInTheDocument();
  });
});

describe("MachineAccess — llms.txt toggle", () => {
  it("clicking 'llms.txt (markdown index)' shows a textarea with markdown starting with # Privacy Atlas", async () => {
    const user = userEvent.setup();
    const { container } = render(<MachineAccess />);

    await user.click(screen.getByRole("button", { name: /llms\.txt \(markdown index\)/i }));

    const ta = container.querySelector("textarea");
    expect(ta).not.toBeNull();
    expect(ta!.value).toMatch(/^# Privacy Atlas/);
    expect(ta!.value).toContain("## Moves");
    expect(ta!.value).toContain("## Threats");
  });

  it("copy button appears when markdown is shown", async () => {
    const user = userEvent.setup();
    render(<MachineAccess />);

    await user.click(screen.getByRole("button", { name: /llms\.txt \(markdown index\)/i }));
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeInTheDocument();
  });
});

describe("MachineAccess — zero user data in JSON export", () => {
  it("JSON textarea does not contain journeyProgress", async () => {
    const user = userEvent.setup();
    const { container } = render(<MachineAccess />);

    await user.click(screen.getByRole("button", { name: /full JSON knowledge base/i }));

    const ta = container.querySelector("textarea");
    expect(ta!.value).not.toContain("journeyProgress");
  });

  it("JSON textarea does not contain 'contributions'", async () => {
    const user = userEvent.setup();
    const { container } = render(<MachineAccess />);

    await user.click(screen.getByRole("button", { name: /full JSON knowledge base/i }));

    const ta = container.querySelector("textarea");
    expect(ta!.value).not.toContain('"contributions"');
  });
});
