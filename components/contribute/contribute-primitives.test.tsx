/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures use loosely-typed contribution shapes */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ProposeNode from "./ProposeNode";
import ContribCard from "./ContribCard";

// ---------------------------------------------------------------------------
// Stub byId map — counter-relation resolution matches on .label (case-insensitive)
// ---------------------------------------------------------------------------
const stubById = new Map([
  ["password-manager", { label: "Password manager", kind: "node" }],
  ["T-data-breach", { label: "Data breach", kind: "threat" }],
]);

// ---------------------------------------------------------------------------
// ProposeNode now submits via POST /api/contribute/submit. These helpers give
// it a signed-in address + a captured fetch so we can assert the payload that
// reaches the backend (the old localStorage proposedNodes write is gone).
// ---------------------------------------------------------------------------
const signedIn = "0x1111111111111111111111111111111111111111";
const signIn = vi.fn(async () => signedIn);
const onSubmitted = vi.fn(async () => {});

let submitBody: any = null;
function mockSubmitOk() {
  submitBody = null;
  (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
    if (typeof url === "string" && url.includes("/api/contribute/submit")) {
      submitBody = opts?.body ? JSON.parse(opts.body) : null;
      return { ok: true, status: 200, json: async () => ({ id: "srv-id-1" }) } as any;
    }
    return { ok: true, status: 200, json: async () => ({}) } as any;
  });
}

beforeEach(() => {
  (globalThis as any).window = (globalThis as any).window || {};
  (globalThis as any).window.storage = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) };
  signIn.mockClear();
  onSubmitted.mockClear();
  mockSubmitOk();
});
afterEach(() => vi.restoreAllMocks());

// renders ProposeNode already signed in (address provided)
function renderSignedIn(setC = vi.fn(), byId: Map<string, { label: string; [k: string]: any }> = stubById, contributions: any = {}) {
  render(
    <ProposeNode
      contributions={contributions}
      setContributions={setC}
      byId={byId}
      address={signedIn}
      signIn={signIn}
      onSubmitted={onSubmitted}
    />
  );
  return setC;
}

// ---------------------------------------------------------------------------
// ProposeNode — structure
// ---------------------------------------------------------------------------
describe("ProposeNode", () => {
  test("renders form controls (kind select, domain select, label input, submit button)", () => {
    renderSignedIn();

    const combos = screen.getAllByRole("combobox");
    expect(combos.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("option", { name: /new MOVE/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /new THREAT/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /propose it/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/REQUIRED — caveat/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Source URL/i)).toBeInTheDocument();
  });

  test("renders section heading copy verbatim", () => {
    renderSignedIn();
    expect(screen.getByText(/PROPOSE A NEW NODE/i)).toBeInTheDocument();
    expect(screen.getByText(/none of these really fit/i)).toBeInTheDocument();
  });

  test("shows the 'Proposals so far' trail after a successful submit", async () => {
    const user = userEvent.setup();
    renderSignedIn();

    await user.type(screen.getByPlaceholderText(/Move name, verb-first/i), "My proposal node");
    await user.type(
      screen.getByPlaceholderText(/Summary: what is it/i),
      "A perfectly reasonable proposal summary that is long enough to clear the validation gate."
    );
    await user.type(
      screen.getByPlaceholderText(/REQUIRED — caveat/i),
      "Caveat: this only helps in the specific scenario described above."
    );
    await user.type(screen.getByPlaceholderText(/Source URL/i), "https://example.com/proposal");
    await user.click(screen.getByRole("button", { name: /propose it/i }));

    expect(await screen.findByText(/Proposals so far/i)).toBeInTheDocument();
    expect(screen.getByText(/My proposal node/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Validation test 1: honesty field empty → BLOCKED (no submit fetch)
  // -------------------------------------------------------------------------
  test("blocks submit when honesty field is empty — shows error, does NOT POST", async () => {
    const user = userEvent.setup();
    renderSignedIn();

    await user.type(screen.getByPlaceholderText(/Move name, verb-first/i), "Disable microphone on smart TV");
    await user.type(
      screen.getByPlaceholderText(/Summary: what is it/i),
      "Smart TVs often have always-on microphones that can be silenced in the settings menu to reduce ambient surveillance risk."
    );
    // Leave honesty EMPTY
    await user.type(screen.getByPlaceholderText(/Source URL/i), "https://example.com/smart-tv-mic");

    await user.click(screen.getByRole("button", { name: /propose it/i }));

    expect(submitBody).toBeNull();
    expect(screen.getByText(/every move needs its caveat/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Validation test 2: source URL empty → BLOCKED (no submit fetch)
  // -------------------------------------------------------------------------
  test("blocks submit when source URL is empty — shows error, does NOT POST", async () => {
    const user = userEvent.setup();
    renderSignedIn();

    await user.type(screen.getByPlaceholderText(/Move name, verb-first/i), "Use a VPN for all traffic");
    await user.type(
      screen.getByPlaceholderText(/Summary: what is it/i),
      "A VPN tunnels your traffic and masks your IP address from your ISP and local network observers."
    );
    await user.type(
      screen.getByPlaceholderText(/REQUIRED — caveat/i),
      "VPNs shift trust to the provider and do not prevent browser fingerprinting or cookies."
    );
    // Leave source URL EMPTY

    await user.click(screen.getByRole("button", { name: /propose it/i }));

    expect(submitBody).toBeNull();
    expect(screen.getByText(/claims without sources don't enter the graph/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Happy path: all required fields filled → POSTs a ProposedNodePayload
  // -------------------------------------------------------------------------
  test("happy path: POSTs a payload with nodeKind, honesty, and src, then re-fetches the list", async () => {
    const user = userEvent.setup();
    renderSignedIn();

    await user.type(screen.getByPlaceholderText(/Move name, verb-first/i), "Audit app permissions monthly");
    await user.type(
      screen.getByPlaceholderText(/Summary: what is it/i),
      "Reviewing app permissions monthly catches permission creep and reduces the attack surface across your devices significantly."
    );
    await user.type(
      screen.getByPlaceholderText(/REQUIRED — caveat/i),
      "Only effective if you actually revoke permissions you find — easy to audit, easy to dismiss without action."
    );
    await user.type(screen.getByPlaceholderText(/Source URL/i), "https://privacyguides.org/audit-permissions");

    await user.click(screen.getByRole("button", { name: /propose it/i }));

    await waitFor(() => expect(submitBody).not.toBeNull());
    expect(submitBody.nodeKind).toBe("move");
    expect(submitBody.label).toBe("Audit app permissions monthly");
    expect(submitBody.honesty).toMatch(/Only effective/);
    expect(submitBody.src).toMatchObject({ url: "https://privacyguides.org/audit-permissions" });
    // server now owns id/ts/confirms/flags — client no longer sends them
    expect(submitBody).not.toHaveProperty("id");
    expect(submitBody).not.toHaveProperty("confirms");
    // parent list is refreshed
    expect(onSubmitted).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Threat kind: honesty placeholder changes, nodeKind = "threat" on submit
  // -------------------------------------------------------------------------
  test("switches to threat kind — placeholder changes and nodeKind is 'threat' on submit", async () => {
    const user = userEvent.setup();
    renderSignedIn();

    const [kindSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(kindSelect, "threat");

    expect(screen.getByPlaceholderText(/REQUIRED — residual risk/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Threat name/i), "Smart-TV ambient listening");
    await user.type(
      screen.getByPlaceholderText(/Summary: what is it/i),
      "Many smart TVs ship with always-on voice recognition that streams audio fragments to manufacturer servers for ad profiling."
    );
    await user.type(
      screen.getByPlaceholderText(/REQUIRED — residual risk/i),
      "Even with the mic muted in software, hardware-level capture may persist on some devices."
    );
    await user.type(screen.getByPlaceholderText(/Source URL/i), "https://example.com/smart-tv-research");

    await user.click(screen.getByRole("button", { name: /propose it/i }));

    await waitFor(() => expect(submitBody).not.toBeNull());
    expect(submitBody.nodeKind).toBe("threat");
  });

  // -------------------------------------------------------------------------
  // Counter-relation resolution: label → id
  // -------------------------------------------------------------------------
  test("resolves counter-relation label to id on submit", async () => {
    const user = userEvent.setup();
    const byId = new Map([
      ["password-manager", { label: "Password manager" }],
      ["signal-messaging", { label: "Signal messaging" }],
    ]);
    renderSignedIn(vi.fn(), byId);

    await user.type(screen.getByPlaceholderText(/Move name, verb-first/i), "Use a password manager");
    await user.type(
      screen.getByPlaceholderText(/Summary: what is it/i),
      "Password managers generate and store unique credentials so you never reuse passwords across sites."
    );
    await user.type(
      screen.getByPlaceholderText(/REQUIRED — caveat/i),
      "The manager itself becomes a single point of failure if its master password is compromised."
    );
    await user.type(screen.getByPlaceholderText(/Source URL/i), "https://privacyguides.org/passwords");
    await user.type(screen.getByPlaceholderText(/What existing threats does it counter/i), "password manager");

    await user.click(screen.getByRole("button", { name: /propose it/i }));

    await waitFor(() => expect(submitBody).not.toBeNull());
    expect(submitBody.rel).toContain("password-manager");
  });

  // -------------------------------------------------------------------------
  // Domain-gap write: checkbox + gapName → appended to domainGaps on submit.
  // (The domain-gap tally still rides along in shared storage via setContributions.)
  // -------------------------------------------------------------------------
  test("domain-gap: checking 'none of these really fit' + filling gapName writes domainGaps on submit", async () => {
    const user = userEvent.setup();
    const setC = vi.fn();
    renderSignedIn(setC);

    const gapCheckbox = screen.getByRole("checkbox");
    await user.click(gapCheckbox);

    await user.type(
      screen.getByPlaceholderText(/What would you call the missing domain/i),
      "neuro / brain-interface"
    );

    await user.type(screen.getByPlaceholderText(/Move name, verb-first/i), "Opt out of neural data collection");
    await user.type(
      screen.getByPlaceholderText(/Summary: what is it/i),
      "Review and revoke any consent given to BCI and neuro-data platforms collecting brain-signal recordings."
    );
    await user.type(
      screen.getByPlaceholderText(/REQUIRED — caveat/i),
      "Consent revocation is not always technically enforced; stored data may persist with the vendor."
    );
    await user.type(screen.getByPlaceholderText(/Source URL/i), "https://example.com/neural-privacy");

    await user.click(screen.getByRole("button", { name: /propose it/i }));

    // the node payload reached the backend
    await waitFor(() => expect(submitBody).not.toBeNull());
    expect(submitBody.label).toBe("Opt out of neural data collection");

    // domainGaps still written to shared storage via setContributions
    await waitFor(() => expect(setC).toHaveBeenCalled());
    const arg = setC.mock.calls[setC.mock.calls.length - 1][0];
    expect(arg.domainGaps).toBeDefined();
    expect(arg.domainGaps).toHaveLength(1);
    const gap = arg.domainGaps[0];
    expect(gap.name).toBe("neuro / brain-interface");
    expect(gap.withNode).toBe("Opt out of neural data collection");
    expect(typeof gap.ts).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// ContribCard
// ---------------------------------------------------------------------------
describe("ContribCard", () => {
  test("renders number badge, title, and body text", () => {
    render(<ContribCard n="1" title="Evidence-first edits" body="Every proposed change must attach a source." />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Evidence-first edits")).toBeInTheDocument();
    expect(screen.getByText("Every proposed change must attach a source.")).toBeInTheDocument();
  });

  test("renders n=4 with body about versioning", () => {
    render(
      <ContribCard
        n="4"
        title="Versioned & reversible"
        body="Edits are auditable and can be rolled back. Contributors are attributed. Disputes are surfaced, not hidden."
      />
    );
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("Versioned & reversible")).toBeInTheDocument();
    expect(screen.getByText(/auditable/)).toBeInTheDocument();
  });
});
