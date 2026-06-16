import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AILauncher from "@/components/ai/AILauncher";
import AIModal from "@/components/ai/AIModal";

/* ---------- AILauncher ---------- */

test("AILauncher renders the labeled pill and calls onOpen when clicked", async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  render(<AILauncher onOpen={onOpen} />);
  const btn = screen.getByRole("button", { name: /ask the atlas ai assistant/i });
  expect(btn).toHaveTextContent(/ask ai/i);
  await user.click(btn);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("AILauncher renders nothing when hidden", () => {
  const { container } = render(<AILauncher onOpen={vi.fn()} hidden />);
  expect(container.firstChild).toBeNull();
});

/* ---------- AIModal ---------- */

test("AIModal renders nothing when open=false", () => {
  const { container } = render(<AIModal open={false} onClose={vi.fn()} />);
  expect(container.firstChild).toBeNull();
});

test("AIModal open=true shows heading + capability line + the 3 task starters", () => {
  render(<AIModal open onClose={vi.fn()} />);
  expect(screen.getByText("✦ Atlas assistant")).toBeInTheDocument();
  expect(screen.getByText(/recommends moves grounded in this map/i)).toBeInTheDocument();
  expect(screen.getByText("◈ Pick my first move")).toBeInTheDocument();
  expect(screen.getByText("◎ Find my weakest spots")).toBeInTheDocument();
  expect(screen.getByText("⟳ Re-check my progress")).toBeInTheDocument();
});

test("AIModal: Esc closes", () => {
  const onClose = vi.fn();
  render(<AIModal open onClose={onClose} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("AIModal: backdrop click closes, panel click does not", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<AIModal open onClose={onClose} />);

  // Clicking inside the dialog panel must NOT close
  const heading = screen.getByText("✦ Atlas assistant");
  await user.click(heading);
  expect(onClose).not.toHaveBeenCalled();

  // Clicking the backdrop (the dialog's parent overlay) closes
  const panel = screen.getByRole("dialog");
  const backdrop = panel.parentElement as HTMLElement;
  await user.click(backdrop);
  expect(onClose).toHaveBeenCalledTimes(1);
});
