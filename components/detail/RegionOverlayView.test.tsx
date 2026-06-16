/* eslint-disable @typescript-eslint/no-explicit-any -- ModelNode fixture uses loose region blobs; any is intentional in test helpers */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RegionOverlayView from "./RegionOverlayView";
import { fetchRegions } from "@/lib/contribute/vote-state";
import type { ModelNode } from "@/lib/types";

vi.mock("@/lib/contribute/vote-state", () => ({ fetchRegions: vi.fn(), fetchNodeVoteState: vi.fn(), castNodeVote: vi.fn() }));
vi.mock("@/lib/wallet", () => ({ connectAndSignIn: vi.fn().mockResolvedValue("0xabc") }));
const BAKED: Record<string, any[]> = {};
vi.mock("@/data/community-content", () => ({ COMMUNITY_REGIONS: new Proxy({}, { get: (_t, k: string) => BAKED[k] }) }));
vi.mock("@/components/contribute/VoteControl", () => ({ VoteControl: ({ nodeId }: { nodeId: string }) => <div data-testid="vote" data-id={nodeId} /> }));

const localized = (regions?: Record<string, any>): ModelNode =>
  ({ id: "credit-freeze-big3", label: "Freeze your credit", kind: "node", tier: 1, regionScope: "localized", regions } as unknown as ModelNode);
const globalNode = (): ModelNode =>
  ({ id: "password-manager", label: "Use a password manager", kind: "node", tier: 1, regionScope: "global" } as unknown as ModelNode);

beforeEach(() => { for (const k of Object.keys(BAKED)) delete BAKED[k]; (fetchRegions as any).mockReset().mockResolvedValue([]); });
afterEach(() => vi.restoreAllMocks());

describe("RegionOverlayView", () => {
  it("renders nothing when no country is selected", () => {
    const { container } = render(<RegionOverlayView node={localized()} country={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("renders nothing for the US baseline", () => {
    const { container } = render(<RegionOverlayView node={localized()} country="US" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("renders the overlay when one exists for the country", async () => {
    const node = localized({ DE: { status: "different", note: "Use SCHUFA instead.", steps: ["Contact SCHUFA"], law: { name: "BDSG", ref: "§1" }, sources: [{ title: "SCHUFA", url: "https://www.schufa.de" }] } });
    render(<RegionOverlayView node={node} country="DE" />);
    expect(await screen.findByText(/IN YOUR REGION/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Germany/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Use SCHUFA instead.")).toBeInTheDocument();
    expect(screen.getByText("Contact SCHUFA")).toBeInTheDocument();
    expect(screen.getByText(/BDSG/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /SCHUFA/ })).toHaveAttribute("href", "https://www.schufa.de");
  });
  it("shows the honest banner for a localized move with no overlay for the country", async () => {
    render(<RegionOverlayView node={localized()} country="DE" />);
    expect(await screen.findByText(/written for the US/i)).toBeInTheDocument();
    expect(screen.getByText(/not yet localized for/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Germany/).length).toBeGreaterThanOrEqual(1);
  });
  it("renders nothing for a global move with no overlay", () => {
    const { container } = render(<RegionOverlayView node={globalNode()} country="DE" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a baked community overlay with a VoteControl for the selected country", async () => {
    BAKED["credit-freeze-big3"] = [{ id: "reg-de-1", country: "DE", status: "different", note: "Community: use SCHUFA.", src: { url: "https://x.example" } }];
    render(<RegionOverlayView node={localized()} country="DE" />);
    expect(await screen.findByText("Community: use SCHUFA.")).toBeInTheDocument();
    expect(screen.getByTestId("vote").getAttribute("data-id")).toBe("reg-de-1");
  });
  it("renders a live community overlay and filters by country", async () => {
    (fetchRegions as any).mockResolvedValue([
      { id: "live-de", payload: { kind: "region", targetId: "credit-freeze-big3", country: "DE", status: "applies", note: "live DE note" }, score: 0, badge: "none", status: "pending", stale: false },
      { id: "live-gb", payload: { kind: "region", targetId: "credit-freeze-big3", country: "GB", status: "applies", note: "live GB note" }, score: 0, badge: "none", status: "pending", stale: false },
    ]);
    render(<RegionOverlayView node={localized()} country="DE" />);
    expect(await screen.findByText("live DE note")).toBeInTheDocument();
    expect(screen.queryByText("live GB note")).toBeNull();
  });
  it("does NOT show the honest banner when a community overlay exists", async () => {
    BAKED["credit-freeze-big3"] = [{ id: "reg-de-2", country: "DE", status: "applies", note: "covered" }];
    render(<RegionOverlayView node={localized()} country="DE" />);
    await screen.findByText("covered");
    expect(screen.queryByText(/written for the US/i)).toBeNull();
  });
  it("PHISHING GUARD: an unverified live overlay's src is plain text, not a link", async () => {
    (fetchRegions as any).mockResolvedValue([
      { id: "live-unv", payload: { kind: "region", targetId: "credit-freeze-big3", country: "DE", status: "applies", src: { url: "https://evil.example", title: "claimed" } }, score: 0, badge: "none", status: "pending", stale: false },
    ]);
    const { container } = render(<RegionOverlayView node={localized()} country="DE" />);
    await screen.findByText(/claimed source \(verify\)/i);
    expect(container.querySelectorAll('a[href="https://evil.example"]')).toHaveLength(0);
  });
  it("opens the contribute form from the banner CTA", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<RegionOverlayView node={localized()} country="DE" />);
    await user.click(await screen.findByRole("button", { name: /add steps for/i }));
    expect(screen.getByRole("button", { name: /^submit$/i })).toBeInTheDocument();
  });
});
