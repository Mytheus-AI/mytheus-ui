import { Hanken_Grotesk, Newsreader, Syne } from "next/font/google";

/**
 * The type pair for every surface. The root layout puts both variables on <body>; globals.css
 * maps them to `--font-sans` and `--font-display`. Hanken Grotesk carries the interface and body
 * copy; Syne is for display titles (`.display`) and the wordmark.
 */
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

/* Syne grows wider as it gets heavier, and its 600 to 800 weights read as too wide. Only 400 and
   500 are loaded, so a heavier request (`.display` is 600, some titles ask for semibold) resolves
   to 500, and `font-synthesis: none` on <body> (globals.css) stops the browser faking a bolder or
   slanted face. Syne has no italic: the italic quotes render upright. */
export const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-syne",
  display: "swap",
});

/* The marketing home page keeps its serif titles: Newsreader there, Syne everywhere else. The
   variable sits on <body> for every page, but the font is not preloaded and a browser only
   downloads a face something actually uses, so other pages never fetch it. The switch is
   `body:has([data-home-type])` in globals.css; the home page renders that marker. */
export const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
  preload: false,
});

/** Class string to put on the `.mx-app` root so both font variables resolve beneath it. */
export const appFontClass = `${hanken.variable} ${syne.variable}`;

/**
 * The auth pages speak the app's type pair, because they are the door into it. (The Caveat
 * handwriting face the old doodle sketchbook used is gone with the one-line redesign.)
 */
export const authFontClass = appFontClass;
