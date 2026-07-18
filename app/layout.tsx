import type { Metadata } from "next";
import { Toaster } from "sonner";
import { fontVars } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NyaNovel — AI image generation",
    template: "%s · NyaNovel",
  },
  description:
    "A fast, refined browser client for NovelAI image generation — prompts, characters, vibe transfer, director tools and a local gallery.",
  applicationName: "NyaNovel",
};

// No-flash theme init: read the saved mode/accent before first paint so the page
// never flips from the default dark theme. Kept inline (not a component) so it runs
// synchronously in <head>. Mirrors the data-mode / data-accent contract in globals.css.
const THEME_NO_FLASH = `
(function () {
  try {
    var d = document.documentElement;
    var m = localStorage.getItem("nya-mode") || "dark";
    var a = localStorage.getItem("nya-accent");
    d.setAttribute("data-mode", m);
    if (a) d.setAttribute("data-accent", a);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fontVars} h-full`} data-mode="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-fg antialiased">
        {children}
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
