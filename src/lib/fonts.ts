import { Hanken_Grotesk, Newsreader } from "next/font/google";

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

/** Class string to put on the `.mx-app` root so both font variables resolve beneath it. */
export const appFontClass = `${hanken.variable} ${newsreader.variable}`;

/**
 * The auth pages speak the app's type pair, because they are the door into it. (The Caveat
 * handwriting face the old doodle sketchbook used is gone with the one-line redesign.)
 */
export const authFontClass = appFontClass;
