import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/contribute/vote-state", () => ({
  fetchNodeVoteState: vi.fn(),
  castNodeVote: vi.fn(),
}));
import { fetchNodeVoteState, castNodeVote } from "@/lib/contribute/vote-state";
import { VoteControl } from "./VoteControl";

beforeEach(() => vi.clearAllMocks());

describe("VoteControl", () => {
  it("shows the net score to everyone", async () => {
    (fetchNodeVoteState as ReturnType<typeof vi.fn>).mockResolvedValue({ confirms: 12, flags: 3, score: 9, badge: "verified", status: "verified", stale: false });
    render(<VoteControl nodeId="n1" />);
    expect(await screen.findByText("9")).toBeTruthy();
  });
  it("shows a stale marker when flagged", async () => {
    (fetchNodeVoteState as ReturnType<typeof vi.fn>).mockResolvedValue({ confirms: 1, flags: 6, score: -5, badge: "none", status: "pending", stale: true });
    render(<VoteControl nodeId="n2" />);
    expect(await screen.findByText(/possibly stale/i)).toBeTruthy();
  });
  it("prompts sign-in when a vote needs auth", async () => {
    (fetchNodeVoteState as ReturnType<typeof vi.fn>).mockResolvedValue({ confirms: 0, flags: 0, score: 0, badge: "none", status: "pending", stale: false });
    (castNodeVote as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, reason: "signin" });
    render(<VoteControl nodeId="n3" />);
    (await screen.findByLabelText(/thumbs up/i)).click();
    expect(await screen.findByText(/connect a wallet/i)).toBeTruthy();
  });
  it("optimistically bumps the score on a successful vote", async () => {
    (fetchNodeVoteState as ReturnType<typeof vi.fn>).mockResolvedValue({ confirms: 2, flags: 0, score: 2, badge: "none", status: "pending", stale: false });
    (castNodeVote as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    render(<VoteControl nodeId="n4" />);
    (await screen.findByLabelText(/thumbs up/i)).click();
    await waitFor(() => expect(screen.getByTitle(/net community score/i).textContent).toBe("3"));
  });
  it("shows a ✓ verified badge when the node is verified", async () => {
    (fetchNodeVoteState as ReturnType<typeof vi.fn>).mockResolvedValue({ confirms: 20, flags: 0, score: 20, badge: "verified", status: "verified", stale: false });
    render(<VoteControl nodeId="v1" />);
    expect(await screen.findByText(/✓ verified/)).toBeTruthy();
  });
  it("shows no ✓ verified badge when badge is none", async () => {
    (fetchNodeVoteState as ReturnType<typeof vi.fn>).mockResolvedValue({ confirms: 2, flags: 0, score: 2, badge: "none", status: "pending", stale: false });
    render(<VoteControl nodeId="v2" />);
    await screen.findByLabelText(/thumbs up/i); // control rendered
    expect(screen.queryByText(/✓ verified/)).toBeNull();
  });
  it("renders nothing when the backend is unavailable", async () => {
    (fetchNodeVoteState as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("down"));
    const { container } = render(<VoteControl nodeId="n5" />);
    await waitFor(() => expect(container.querySelector("button")).toBeNull());
  });
});
