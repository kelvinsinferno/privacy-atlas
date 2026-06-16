import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIModal from "@/components/ai/AIModal";

/* ============================================================
   Footer MCP link (chat view)
   ============================================================ */

test("AIModal: footer link renders in chat view when modal is open", () => {
  render(<AIModal open onClose={vi.fn()} />);
  expect(screen.getByText(/Prefer your own AI\? Connect it over MCP/)).toBeInTheDocument();
});

/* ============================================================
   View-toggle: chat → connect → chat
   ============================================================ */

test("AIModal: clicking footer link switches to connect view", async () => {
  const user = userEvent.setup();
  render(<AIModal open onClose={vi.fn()} />);

  const footerBtn = screen.getByText(/Prefer your own AI\? Connect it over MCP/);
  await user.click(footerBtn);

  // Connect view heading appears
  expect(screen.getByText("✦ Connect your own AI")).toBeInTheDocument();
  // Back button appears
  expect(screen.getByText("‹ back to the assistant")).toBeInTheDocument();
  // Chat view heading no longer visible
  expect(screen.queryByText("✦ Atlas assistant")).not.toBeInTheDocument();
});

test("AIModal: clicking back button in connect view returns to chat view", async () => {
  const user = userEvent.setup();
  render(<AIModal open onClose={vi.fn()} />);

  // Navigate to connect view
  await user.click(screen.getByText(/Prefer your own AI\? Connect it over MCP/));
  expect(screen.getByText("✦ Connect your own AI")).toBeInTheDocument();

  // Navigate back
  await user.click(screen.getByText("‹ back to the assistant"));

  // Chat view heading is back
  expect(screen.getByText("✦ Atlas assistant")).toBeInTheDocument();
  // Connect view heading is gone
  expect(screen.queryByText("✦ Connect your own AI")).not.toBeInTheDocument();
});
