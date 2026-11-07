import { Hanken_Grotesk, Newsreader } from "next/font/google";

/**
 * The signed-in app's type pair, declared here rather than in the root layout so the marketing
 * site keeps Geist and does not pay for fonts it never renders. Hanken Grotesk carries the
 * interface; Newsreader is for page titles only (the `.display` class inside `.mx-app`).
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
  axes: ["opsz"],
});

/** Class string to put on the `.mx-app` root so both font variables resolve beneath it. */
export const appFontClass = `${hanken.variable} ${newsreader.variable}`;
