import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Geist — the clean, tight grotesk that carries the whole "Playex-style" look:
// huge display headings, nav, and body all in one engineered voice.
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

// Refinity — a bold geometric display face used only for the Mytheus wordmark.
// Single weight (Regular reads heavy by design); never used for numerals.
const refinity = localFont({
  src: "./fonts/Refinity-Regular.woff",
  variable: "--font-wordmark",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mytheus — Every meeting, on repeat.",
  description:
    "Mytheus gives every participant a personal AI agent that captures role-relevant notes, suggests questions in real time, detects conflicts, and manages follow-ups. Agents that collaborate across meetings.",
  openGraph: {
    title: "Mytheus — Every meeting, on repeat.",
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
  // ClerkProvider wraps the whole tree, marketing included, so the header can show a
  // sign-in or account state anywhere. It does not make marketing routes authenticated:
  // src/middleware.ts decides that, and its allowlist keeps them public.
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      // Session tasks render on our own pages instead of Clerk's hosted UI.
      taskUrls={{ "choose-organization": "/onboarding/organization" }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${refinity.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
