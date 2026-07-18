import { Hanken_Grotesk, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";

// Display face for headings and the wordmark.
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-schibsted",
  display: "swap",
});

// Body / UI text.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

// Mono for numerics: seeds, steps, dimensions, sampler params.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVars = `${schibsted.variable} ${hanken.variable} ${jetbrains.variable}`;
