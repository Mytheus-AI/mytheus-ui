import { Hanken_Grotesk, Inter_Tight } from "next/font/google";

/**
 * The type pair for every surface. The root layout puts both variables on <body>; globals.css
 * maps them to `--font-sans` and `--font-display`. Hanken Grotesk carries the interface and body
 * copy; Inter Tight is for display titles (`.display`) and the wordmark: a clean, upright SaaS
 * grotesk with real weights, so nothing is synthesised and nothing is set in italic.
 */
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const appFontClass = `${hanken.variable} ${interTight.variable}`;

/**
 * The auth pages speak the app's type pair, because they are the door into it. (The Caveat
 * handwriting face the old doodle sketchbook used is gone with the one-line redesign.)
 */
export const authFontClass = appFontClass;
