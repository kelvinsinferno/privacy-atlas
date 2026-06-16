import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StepHelp from "./StepHelp";
import type { ModelNode } from "@/lib/types";

// password-manager is NOT in SENSITIVE_NODES; genetic-privacy IS (see data/ui-maps.ts).
const node = (id = "password-manager"): ModelNode =>
  ({ id, label: "Use a password manager", kind: "node", tier: 1 } as unknown as ModelNode);

describe("StepHelp", () => {
  it("renders the help link", () => {
    render(<StepHelp node={node()} steps={["a", "b"]} device="iOS" openAI={vi.fn()} />);
    expect(screen.getByText(/stuck on a step/i)).toBeInTheDocument();
  });

  it("clicking opens the popup seeded with nodeId + the steps + device in the starter", () => {
    const openAI = vi.fn();
    render(<StepHelp node={node()} steps={["open Settings", "tap Privacy"]} device="iOS 26" openAI={openAI} />);
    fireEvent.click(screen.getByText(/stuck on a step/i));
    expect(openAI).toHaveBeenCalledTimes(1);
    const seed = openAI.mock.calls[0]![0]!;
    expect(seed.nodeId).toBe("password-manager");
    expect(seed.title).toBe("Use a password manager");
    expect(seed.sensitive).toBe(false);
    const prompt: string = seed.starters[0].prompt;
    expect(prompt).toContain("Use a password manager");
    expect(prompt).toContain("iOS 26");
    expect(prompt).toContain("open Settings");
    expect(prompt).toContain("tap Privacy");
  });

  it("flags the seed sensitive:true for a sensitive node", () => {
    const openAI = vi.fn();
    render(<StepHelp node={node("genetic-privacy")} steps={["x"]} openAI={openAI} />);
    fireEvent.click(screen.getByText(/stuck on a step/i));
    expect(openAI.mock.calls[0]![0]!.sensitive).toBe(true);
  });

  it("omits the device clause from the starter when no device is given", () => {
    const openAI = vi.fn();
    render(<StepHelp node={node()} steps={["x"]} openAI={openAI} />);
    fireEvent.click(screen.getByText(/stuck on a step/i));
    const prompt: string = openAI.mock.calls[0]![0]!.starters[0].prompt;
    // no device → the first line has no " on <device>" clause before the comma
    expect(prompt).toContain(`to "Use a password manager", and I'm stuck:`);
  });
});
