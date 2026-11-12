import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { hanken, interTight, newsreader, syne } from "@/lib/fonts";
import { THEME_INIT } from "@/components/app/theme-init";
import { ThemeSync } from "@/components/app/ThemeSync";
import "./globals.css";

// One type pair for every surface: Hanken Grotesk carries the interface and body copy,
// Syne is for display titles (the `.display` class) and the wordmark.

export const metadata: Metadata = {
  title: "Mytheus: every meeting, on repeat",
  description:
    "Mytheus gives every participant a Myte, a personal AI agent that captures role-relevant notes, suggests questions in real time, detects conflicts, and manages follow-ups. Mytes that collaborate across meetings.",
  openGraph: {
    title: "Mytheus: every meeting, on repeat",
    description:
      "A Myte for every participant: a personal AI agent with real-time intelligence that collaborates across meetings.",
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
      {/* `js` on <html> before paint: drawn lines and timed reveals start hidden only when a
          script will reveal them, so the page is complete without JavaScript. */}
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
          {/* The colour theme, on <html> before first paint, so no route change can lose it. */}
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        </head>
        <body
          className={`${hanken.variable} ${syne.variable} ${newsreader.variable} ${interTight.variable} antialiased`}
        >
          <ThemeSync />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
