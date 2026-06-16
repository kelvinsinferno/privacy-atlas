import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// HowTo now loads community how-tos via fetchHowtos and renders a VoteControl
// (which reads fetchNodeVoteState / casts via castNodeVote). Mock the whole
// vote-state module so these block tests stay offline and deterministic.
vi.mock("@/lib/contribute/vote-state", () => ({
  fetchHowtos: vi.fn().mockResolvedValue([]),
  fetchResources: vi.fn().mockResolvedValue([]),
  fetchNodeVoteState: vi.fn().mockResolvedValue({ confirms: 0, flags: 0, score: 0, badge: "none", status: "pending", stale: false }),
  castNodeVote: vi.fn().mockResolvedValue({ ok: true }),
}));

import HonestyBlock from "./HonestyBlock";
import HowTo from "./HowTo";
import ResourceList from "./ResourceList";
import RelGroup from "./RelGroup";
import ReviewBadge from "./ReviewBadge";
import DevicesModal from "./DevicesModal";

import { buildModel } from "@/lib/model";
import { HOWTOS } from "@/data/howtos";
import { RESOURCES } from "@/data/resources";
import { affiliate } from "@/data/affiliate";
import type { ModelNode } from "@/lib/types";

const model = buildModel({});
const node = (id: string): ModelNode => {
  const n = model.byId.get(id);
  if (!n) throw new Error("test fixture missing node: " + id);
  return n;
};

test("HonestyBlock renders its label and caveat text", () => {
  render(<HonestyBlock label="CAVEAT" text="A password manager is a single point of failure if its master key leaks." c="#f0a868" />);
  expect(screen.getByText("CAVEAT")).toBeInTheDocument();
  expect(screen.getByText(/single point of failure/)).toBeInTheDocument();
});

test("HowTo renders the seed steps for a node that has a HOWTOS entry", () => {
  // password-manager has a generic starter how-to with known step text
  expect(HOWTOS["password-manager"]).toBeTruthy();
  render(<HowTo node={node("password-manager")} contributions={{}} setContributions={() => {}} />);
  expect(screen.getByText("HOW TO DO THIS")).toBeInTheDocument();
  // first step of the password-manager starter guide
  expect(screen.getByText(/Pick a reputable manager/)).toBeInTheDocument();
});

test("HowTo picks the device variant when myDevices selects a phone", () => {
  // ad-id-reset has phone-axis variants incl. ios — selecting it should show iOS-exact steps
  render(
    <HowTo
      node={node("ad-id-reset")}
      contributions={{}}
      setContributions={() => {}}
      myDevices={{ phone: "ios", desktop: null, browser: null }}
    />
  );
  // variant label header for the iPhone variant
  expect(screen.getByText(/iPhone \(iOS\) — exact steps/)).toBeInTheDocument();
});

test("ResourceList renders links routed through affiliate()", () => {
  const seed = RESOURCES["network-privacy"];
  expect(seed && seed.length).toBeTruthy();
  render(<ResourceList nodeId="network-privacy" contributions={{}} setContributions={() => {}} />);
  expect(screen.getByText("WHAT TO USE")).toBeInTheDocument();
  // Mullvad is a seed resource; its anchor href must be affiliate()-routed
  const link = screen.getByText("Mullvad VPN").closest("a") as HTMLAnchorElement;
  expect(link).toBeTruthy();
  expect(link.getAttribute("href")).toBe(affiliate("https://mullvad.net/"));
  expect(link.getAttribute("href")).toContain("mullvad.net");
});

test("RelGroup renders unique items as clickable pills", () => {
  const items = [node("password-manager"), node("unique-passwords")];
  render(<RelGroup title="ENABLES" items={items} onClick={() => {}} c="#5fd3c8" />);
  expect(screen.getByText("ENABLES")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: node("password-manager").label })).toBeInTheDocument();
});

test("RelGroup renders nothing for an empty item list", () => {
  const { container } = render(<RelGroup title="EMPTY" items={[]} onClick={() => {}} c="#fff" />);
  expect(container).toBeEmptyDOMElement();
});

test("ReviewBadge renders nothing for a plain researched seed node (verification is live via VoteControl)", () => {
  const { container } = render(<ReviewBadge node={node("password-manager")} contributions={{}} />);
  expect(container).toBeEmptyDOMElement();
});

test("DevicesModal renders device options including iPhone and a phone select", () => {
  render(
    <DevicesModal
      myDevices={{ phone: null, desktop: null, browser: null }}
      saveDevices={() => {}}
      onClose={() => {}}
    />
  );
  expect(screen.getByText("MY DEVICES")).toBeInTheDocument();
  // phone axis is a <select> with an iPhone option
  expect(screen.getByRole("option", { name: "iPhone (iOS)" })).toBeInTheDocument();
  // desktop axis renders chips (buttons) — e.g. Windows
  expect(screen.getByRole("button", { name: "Windows" })).toBeInTheDocument();
  expect(screen.getByText("save my devices")).toBeInTheDocument();
});
