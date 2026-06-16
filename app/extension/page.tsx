import type { Metadata } from "next";
import Link from "next/link";
import { mono } from "@/lib/styles";
import { BrandLogoHorizontal } from "@/components/common/BrandLogo";

export const metadata: Metadata = {
  title: "Get the extension · Privacy Atlas",
  description:
    "The Privacy Atlas browser extension names what's tracking you on any page — and the Atlas move that answers it. On-device, no blocking, nothing leaves your browser.",
  openGraph: {
    title: "Get the Privacy Atlas extension",
    description:
      "Names what's tracking you on any page — and the Atlas move that answers it. On-device, open source.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
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

const STORES = [
  { name: "Chrome", glyph: "◆" },
  { name: "Edge", glyph: "◈" },
  { name: "Firefox", glyph: "◇" },
  { name: "Safari", glyph: "❖" },
];

const WHAT = [
  {
    head: "Names what's tracking you",
    body: "On any page, it detects trackers and fingerprinting attempts and tells you who's watching — quietly, in a toolbar badge and an optional on-page note.",
  },
  {
    head: "Points to the move that answers it",
    body: "Each leak is mapped through the leak-class → threat → counter-move bridge straight to the Atlas move that defends against it. It's a meaning layer, not a blocker.",
  },
  {
    head: "Suggests defenses at the moment of use",
    body: "Focus an email, payment, phone, or address field and a quiet chip offers the per-occasion move — an alias, a masked card, a second number. A suggestion, never autofill.",
  },
  {
    head: "Stays entirely on your device",
    body: "All detection runs in the extension. No page content or URLs are transmitted, no history is kept, zero telemetry. The only network request is you clicking “open in Atlas.” Open source.",
  },
];

export default function ExtensionPage() {
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
          <Link
            href="/"
            style={{ ...label, color: C.teal, textDecoration: "none" }}
          >
            ← back to the atlas
          </Link>
        </div>

        {/* hero */}
        <section style={{ marginTop: 34 }}>
          <div style={{ ...label, color: C.amber }}>Browser extension</div>
          <h1
            style={{
              fontSize: 30,
              lineHeight: 1.18,
              margin: "10px 0 0",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            The Atlas, on every page you visit.
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: C.muted,
              margin: "14px 0 0",
              maxWidth: 620,
            }}
          >
            The Privacy Atlas extension names what&apos;s tracking you in the moment — and points
            you to the move that answers it. On-device, no blocking, nothing leaves your browser.
          </p>
        </section>

        {/* what it does */}
        <section style={{ marginTop: 40 }}>
          <div style={{ ...label, marginBottom: 14 }}>What it does</div>
          <div style={{ display: "grid", gap: 12 }}>
            {WHAT.map((w) => (
              <div
                key={w.head}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderLeft: `2px solid ${C.teal}`,
                  borderRadius: 5,
                  padding: "13px 15px",
                }}
              >
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{w.head}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: C.muted, marginTop: 4 }}>
                  {w.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* get it */}
        <section style={{ marginTop: 44 }}>
          <div style={{ ...label, marginBottom: 14 }}>Get it</div>

          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: C.muted, margin: "0 0 14px" }}>
            One-click installs are <span style={{ color: C.amber }}>coming soon</span> to every major
            browser. The store listings are in review.
          </p>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {STORES.map((s) => (
              <span
                key={s.name}
                aria-disabled="true"
                title={`${s.name} listing coming soon`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#0d1016",
                  border: `1px dashed ${C.border}`,
                  borderRadius: 6,
                  padding: "9px 13px",
                  color: C.faint,
                  cursor: "default",
                }}
              >
                <span aria-hidden style={{ color: C.muted }}>{s.glyph}</span>
                <span style={{ fontSize: 13, color: C.text }}>{s.name}</span>
                <span style={{ ...label, fontSize: 9, color: C.amber, letterSpacing: 0.8 }}>soon</span>
              </span>
            ))}
          </div>

          {/* available now */}
          <div
            style={{
              marginTop: 22,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "16px 17px",
            }}
          >
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>
              Want it today? It&apos;s open source — load it unpacked.
            </div>
            <ol
              style={{
                margin: "11px 0 0",
                paddingLeft: 20,
                fontSize: 13,
                lineHeight: 1.7,
                color: C.muted,
              }}
            >
              <li>
                Clone the repo, then build the extension:
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    color: C.teal,
                    background: "#0d1016",
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    margin: "7px 0",
                    overflowX: "auto",
                  }}
                >
                  cd extension &amp;&amp; npm install &amp;&amp; npm run build
                </div>
              </li>
              <li>
                Open <span style={{ fontFamily: mono, color: C.text }}>chrome://extensions</span>,
                turn on <em>Developer mode</em>.
              </li>
              <li>
                Click <em>Load unpacked</em> and choose{" "}
                <span style={{ fontFamily: mono, color: C.text }}>extension/.output/chrome-mv3</span>.
              </li>
            </ol>
            <div style={{ fontSize: 12, color: C.faint, marginTop: 10, lineHeight: 1.5 }}>
              Firefox and Safari builds: <span style={{ fontFamily: mono, color: C.muted }}>npm run build:firefox</span>{" "}
              / <span style={{ fontFamily: mono, color: C.muted }}>build:safari</span>. After reloading the
              extension, refresh open tabs so the new content scripts attach.
            </div>
          </div>
        </section>

        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 36, lineHeight: 1.55 }}>
          The extension reads the same open map you see here — it never adds tracking of its own.{" "}
          <Link href="/" style={{ color: C.teal, textDecoration: "none" }}>
            Explore the Atlas →
          </Link>
        </p>
      </div>
    </div>
  );
}
