/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildModel } from "@/lib/model";
import { buildPath } from "@/lib/path";
import { WORRY } from "@/data/ui-maps";
import Onboarding from "@/components/path/Onboarding";
import PathView from "@/components/path/PathView";

/* ---------- window.storage mock ---------- */
const storageMock = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
};

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).storage = storageMock;
});

/* ============================================================
   Onboarding
   ============================================================ */

test("Onboarding: renders the first question (worry) with its options", () => {
  const onDone = vi.fn();
  const onSkip = vi.fn();
  render(<Onboarding onDone={onDone} onSkip={onSkip} />);

  // First question text
  expect(screen.getByText("Who are you most worried about?")).toBeInTheDocument();

  // WORRY option labels (imported from ui-maps)
  expect(screen.getByText("Advertisers & data brokers")).toBeInTheDocument();
  expect(screen.getByText("A specific person (ex, stalker, harasser)")).toBeInTheDocument();
  expect(screen.getByText("Identity thieves & scammers")).toBeInTheDocument();
  expect(screen.getByText("Government & law enforcement")).toBeInTheDocument();
  expect(screen.getByText("Everything, broadly")).toBeInTheDocument();
});

test("Onboarding: answering all 5 questions calls onDone with correct profile shape", async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  const onSkip = vi.fn();
  render(<Onboarding onDone={onDone} onSkip={onSkip} />);

  // Step 1 — worry: pick "Advertisers & data brokers"
  await user.click(screen.getByText("Advertisers & data brokers"));
  await user.click(screen.getByText("next →"));

  // Step 2 — friction: pick "A solid setup"
  expect(screen.getByText("How much effort can you sustain?")).toBeInTheDocument();
  await user.click(screen.getByText("A solid setup"));
  await user.click(screen.getByText("next →"));

  // Step 3 — level: pick "Total beginner"
  expect(screen.getByText("Where are you starting from?")).toBeInTheDocument();
  await user.click(screen.getByText("Total beginner"));
  await user.click(screen.getByText("next →"));

  // Step 4 — phone age: pick "Under 2 years"
  expect(screen.getByText("How old is your main phone?")).toBeInTheDocument();
  await user.click(screen.getByText("Under 2 years"));
  await user.click(screen.getByText("next →"));
  // Step 5 — country (optional select; leave unset)
  await user.click(screen.getByRole("button", { name: /build my path/i }));

  expect(onDone).toHaveBeenCalledOnce();
  const profile = onDone.mock.calls[0][0];
  expect(profile).toMatchObject({
    worry: "brokers",
    friction: "med",
    level: "beginner",
    domains: null,
    phoneAge: "lt2",
  });
  expect(profile.actors).toEqual(WORRY["brokers"].actors);
  expect(typeof profile.created).toBe("number");
});

test("Onboarding: skip button calls onSkip", async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  const onSkip = vi.fn();
  render(<Onboarding onDone={onDone} onSkip={onSkip} />);

  await user.click(screen.getByText("skip → just explore the map"));
  expect(onSkip).toHaveBeenCalledOnce();
  expect(onDone).not.toHaveBeenCalled();
});

/* ============================================================
   PathView
   ============================================================ */

const model = buildModel({});
const profile = { worry: "brokers", friction: "med", level: "beginner", actors: ["advertiser", "broker", "platform"], domains: null, created: Date.now() };
const path = buildPath(profile);

function renderPathView(overrides: Partial<React.ComponentProps<typeof PathView>> = {}) {
  return render(
    <PathView
      path={path}
      profile={profile}
      setSelected={vi.fn()}
      model={model}
      onExplore={vi.fn()}
      onStart={vi.fn()}
      aiPath={null}
      onClearAIPath={vi.fn()}
      {...overrides}
    />
  );
}

test("PathView: renders a known move label from the computed path", async () => {
  renderPathView();
  // path.length > 0, first item in path should render (use getAllByText since label may appear in <b> too)
  expect(path.length).toBeGreaterThan(0);
  const firstLabel = path[0].node.label;
  await waitFor(() => {
    const matches = screen.getAllByText(firstLabel);
    expect(matches.length).toBeGreaterThan(0);
  });
});

test("PathView: renders the redo setup affordance", async () => {
  renderPathView();
  await waitFor(() => {
    expect(screen.getByText("↻ redo setup")).toBeInTheDocument();
  });
});

test("PathView: renders the 'see it painted' link", async () => {
  renderPathView();
  await waitFor(() => {
    expect(screen.getByText("◇ see it painted on the web →")).toBeInTheDocument();
  });
});

test("PathView: no-profile state renders the build-my-path prompt", () => {
  renderPathView({ profile: null });
  expect(screen.getByText("Privacy is a path, not a pile of warnings.")).toBeInTheDocument();
  expect(screen.getByText("◎ build my path →")).toBeInTheDocument();
});

test("PathView: no-profile 'build my path' calls onStart", async () => {
  const onStart = vi.fn();
  renderPathView({ profile: null, onStart });
  fireEvent.click(screen.getByText("◎ build my path →"));
  expect(onStart).toHaveBeenCalledOnce();
});

test("PathView: AI-BUILT CUSTOM PATH section renders when aiPath is set", async () => {
  const aiPath = {
    moves: ["password-manager", "unique-passwords", "strong-2fa"],
    reason: "Test reason for your custom path",
    ts: Date.now(),
  };
  renderPathView({ aiPath });

  await waitFor(() => {
    expect(screen.getByText("✦ AI-BUILT CUSTOM PATH · from your interview")).toBeInTheDocument();
  });
  expect(screen.getByText("Test reason for your custom path")).toBeInTheDocument();
});

test("PathView: clicking ✕ clear in AI-path section calls onClearAIPath", async () => {
  const user = userEvent.setup();
  const onClearAIPath = vi.fn();
  const aiPath = {
    moves: ["password-manager", "unique-passwords", "strong-2fa"],
    reason: "Some reason",
    ts: Date.now(),
  };
  renderPathView({ aiPath, onClearAIPath });

  await waitFor(() => {
    expect(screen.getByText("✕ clear")).toBeInTheDocument();
  });
  await user.click(screen.getByText("✕ clear"));
  expect(onClearAIPath).toHaveBeenCalledOnce();
});

test("PathView: AI-path move labels render (resolved from model.all)", async () => {
  const aiPath = {
    moves: ["password-manager", "unique-passwords", "strong-2fa"],
    reason: "Custom reason",
    ts: Date.now(),
  };
  renderPathView({ aiPath });

  await waitFor(() => {
    // Labels appear in the AI panel AND may appear in the path list — use getAllByText
    const pmMatches = screen.getAllByText("Password manager");
    expect(pmMatches.length).toBeGreaterThan(0);
    const upMatches = screen.getAllByText("Unique passwords everywhere");
    expect(upMatches.length).toBeGreaterThan(0);
  });
});

test("PathView: 'WHERE YOU ARE' next-step card renders when profile and path are present", async () => {
  // path has items and none are done (storageMock.get returns null → done={})
  // so nextStep = path[0] and the WHERE YOU ARE card should appear
  renderPathView();
  await waitFor(() => {
    expect(screen.getByText(/WHERE YOU ARE/)).toBeInTheDocument();
    expect(screen.getByText(/Next recommended step:/)).toBeInTheDocument();
  });
});
