import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./atlas.css";
import StorageBridge from "@/components/StorageBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "Privacy Atlas",
  description:
    "A crisscrossing map of personal-privacy moves, the threats they answer, and the evidence behind them.",
  openGraph: {
    title: "Privacy Atlas",
    description:
      "A crisscrossing map of personal-privacy moves, the threats they answer, and the evidence behind them.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Atlas",
    description:
      "A crisscrossing map of personal-privacy moves, the threats they answer, and the evidence behind them.",
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StorageBridge />
        {children}
      </body>
    </html>
  );
}
