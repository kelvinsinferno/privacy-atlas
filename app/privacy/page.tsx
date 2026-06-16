import type { Metadata } from "next";
import Link from "next/link";
import { mono } from "@/lib/styles";
import { BrandLogoHorizontal } from "@/components/common/BrandLogo";

export const metadata: Metadata = {
  title: "Privacy Policy · Privacy Atlas",
  description:
    "How Privacy Atlas handles your data: no tracking, no analytics, no accounts to read. The browser extension is fully on-device. Minimal data only when you opt in.",
};

// Brand tokens (mirrors lib/styles.ts S-object + extension/styles.ts — NOT Tailwind).
const C = {
  bg: "#070809",
  surface: "#10141b",
  border: "#232a36",
  text: "#d4dae6",
  muted: "#969eb0",
  faint: "#7e8798",
  teal: "#5fd3c8",
  amber: "#f0c468",
};

const label: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 1.1,
  color: "#8893a4",
  textTransform: "uppercase",
};

const LAST_UPDATED = "June 16, 2026";

const SECTIONS: { head: string; body: React.ReactNode }[] = [
  {
    head: "Reading the atlas",
    body: "Browsing Privacy Atlas requires no account and no sign-in. We set no tracking cookies, run no analytics, and embed no third-party trackers or ad scripts. The knowledge you read is static, open data — looking at it tells us nothing about you.",
  },
  {
    head: "The AI assistant",
    body: "When you ask the in-app assistant a question, your message is sent to our AI provider (xAI / Grok) solely to generate the answer, then returned to you. Data-sharing with the provider is turned OFF, so your questions are not used to train models. Optionally — and only if you choose to — a coarse, non-identifying context may accompany the question (a short summary of the defenses you've adopted, a phone-age range like “2–4 years,” or a two-letter country code). Sharing your progress is OFF by default. We do not store your conversations tied to your identity.",
  },
  {
    head: "Contributing and voting",
    body: "Adding content or voting is optional and requires connecting a crypto wallet. When you do, your public wallet address is stored alongside the contributions and votes you make (this is how authorship and one-person-one-vote work). A signed session cookie (pa_session) keeps you logged in. To deter spam, we check a humanity score from Human Passport — we receive only a number, not your stamps or identity. We never see or store private keys, and we never request funds.",
  },
  {
    head: "The browser extension",
    body: "The Privacy Atlas browser extension runs entirely on your device. It does not collect, transmit, or store any personal data on remote servers. Tracker detection uses lists bundled at install time — no remote code is fetched at runtime. There is no telemetry, no analytics, and no history of the sites you visit. The only time the extension makes a network request is when you explicitly click “open in Atlas,” which opens this site with a topic identifier in the URL.",
  },
  {
    head: "What we never do",
    body: "We do not sell your data, share it with advertisers, or use it for behavioral profiling. Some outbound links to recommended tools may be affiliate links (disclosed as such in the app); following one takes you to a third-party site governed by its own privacy policy.",
  },
  {
    head: "Your choices and contact",
    body: (
      <>
        Reading and the extension involve no personal data to manage. Contributions and votes are tied
        to the wallet address you used; to request removal of content you submitted, open an issue at{" "}
        <a
          href="https://github.com/kelvinsinferno/privacy-atlas"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: C.teal, textDecoration: "none" }}
        >
          github.com/kelvinsinferno/privacy-atlas
        </a>
        . The project is open source, so you can audit exactly how data is handled.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Georgia', serif",
        padding: "26px 22px 64px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* top bar: brand (→ home) + back link */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingBottom: 22,
            borderBottom: `1px solid #1a1f29`,
          }}
        >
          <Link href="/" aria-label="Privacy Atlas home" style={{ display: "inline-flex", textDecoration: "none" }}>
            <BrandLogoHorizontal style={{ height: 34 }} />
          </Link>
          <Link href="/" style={{ ...label, color: C.teal, textDecoration: "none" }}>
            ← back to the atlas
          </Link>
        </div>

        {/* hero */}
        <section style={{ marginTop: 34 }}>
          <div style={{ ...label, color: C.amber }}>Privacy Policy</div>
          <h1 style={{ fontSize: 30, lineHeight: 1.18, margin: "10px 0 0", color: "#fff", fontWeight: 600 }}>
            We built a privacy tool. We act like one.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: C.muted, margin: "14px 0 0", maxWidth: 620 }}>
            No accounts to read. No tracking, no analytics, no ads. The browser extension is entirely
            on-device. The only data we ever touch is the minimum needed for features you opt into —
            and we tell you exactly what that is below.
          </p>
        </section>

        {/* sections */}
        <section style={{ marginTop: 40 }}>
          <div style={{ display: "grid", gap: 12 }}>
            {SECTIONS.map((sct) => (
              <div
                key={sct.head}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderLeft: `2px solid ${C.teal}`,
                  borderRadius: 5,
                  padding: "13px 15px",
                }}
              >
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{sct.head}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: C.muted, marginTop: 5 }}>{sct.body}</div>
              </div>
            ))}
          </div>
        </section>

        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 36, lineHeight: 1.55 }}>
          Last updated: {LAST_UPDATED}.{" "}
          <Link href="/" style={{ color: C.teal, textDecoration: "none" }}>
            Explore the Atlas →
          </Link>
        </p>
      </div>
    </div>
  );
}
