import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces } from "next/font/google";
import "./globals.css";

// Geist — the engineered, geometric voice for UI + body copy.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
  display: "swap",
});

// Fraunces — the elegant editorial serif used for major display headings.
// This high-contrast serif against the geometric sans is the core of the look.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Brand logotype only — Refinity (zeenesia studio). Personal-use license.
const refinity = localFont({
  src: "./fonts/Refinity-Regular.woff",
  variable: "--font-logo",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reprise — Every meeting, on repeat.",
  description:
    "Reprise gives every participant a personal AI agent that captures role-relevant notes, suggests questions in real time, detects conflicts, and manages follow-ups. Agents that collaborate across meetings.",
  openGraph: {
    title: "Reprise — Every meeting, on repeat.",
    description:
      "A personal AI agent for every participant. Real-time intelligence that collaborates across meetings.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${refinity.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
