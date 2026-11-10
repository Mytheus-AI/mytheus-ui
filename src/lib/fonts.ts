import { Caveat, Fraunces, Hanken_Grotesk, Newsreader } from "next/font/google";

/**
 * The type pair for every surface. The root layout puts both variables on <body>; globals.css
 * maps them to `--font-sans` and `--font-display`. Hanken Grotesk carries the interface and body
 * copy; Newsreader is for display titles (`.display`) and the wordmark.
 */
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

/** The meeting design's wordmark face (`--wordmark` in src/styles/meeting.css). Meeting tab only. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: "600",
});

/** Class string to put on the `.mx-app` root so both font variables resolve beneath it. */
export const appFontClass = `${hanken.variable} ${newsreader.variable}`;

/** Handwriting for the doodle annotations on the auth pages (speech bubbles, margin notes). */
export const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});

/** The auth pages speak the app's type (they are the door into it) plus the doodle hand. */
export const authFontClass = `${hanken.variable} ${newsreader.variable} ${caveat.variable}`;
