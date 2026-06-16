import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectAIView, { MCP_URL } from "./ConnectAIView";

function renderView(onBack = vi.fn()) {
  return render(<ConnectAIView onBack={onBack} />);
}

/* ============================================================
   Basic render
   ============================================================ */

test("ConnectAIView: renders the heading", () => {
  renderView();
  expect(screen.getByText("✦ Connect your own AI")).toBeInTheDocument();
});

test("ConnectAIView: renders the MCP URL", () => {
  renderView();
  expect(screen.getByText(MCP_URL)).toBeInTheDocument();
});

test("ConnectAIView: renders all four client names", () => {
  renderView();
  expect(screen.getByText("Claude")).toBeInTheDocument();
  expect(screen.getByText("ChatGPT")).toBeInTheDocument();
  expect(screen.getByText("Grok")).toBeInTheDocument();
  expect(screen.getByText("Perplexity, Cursor, VS Code, others")).toBeInTheDocument();
});

test("ConnectAIView: copy button renders with text 'copy'", () => {
  renderView();
  expect(screen.getByRole("button", { name: "copy" })).toBeInTheDocument();
});

/* ============================================================
   Interaction
   ============================================================ */

test("ConnectAIView: clicking back button calls onBack", async () => {
  const user = userEvent.setup();
  const onBack = vi.fn();
  renderView(onBack);

  await user.click(screen.getByText("‹ back to the assistant"));

  expect(onBack).toHaveBeenCalledOnce();
});
