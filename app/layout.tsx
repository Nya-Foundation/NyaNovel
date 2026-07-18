import type { Metadata } from "next";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { fontVars } from "@/lib/fonts";
import brandIcon from "@/assets/brand/icon-512.png";
import socialBanner from "@/assets/brand/github-social-banner.png";
import "./globals.css";

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function validOrigin(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}

/**
 * Resolve absolute social-image URLs at request time so one public container image works behind
 * any domain or reverse proxy. SITE_URL is an optional runtime canonical-origin override; without
 * it, standard forwarded headers are used before falling back to the direct Host header.
 */
export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const fixedOrigin = validOrigin(process.env.SITE_URL);
  const forwardedHost = firstHeaderValue(requestHeaders.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(requestHeaders.get("host"));
  const forwardedProto = firstHeaderValue(requestHeaders.get("x-forwarded-proto"));
  const protocol = forwardedProto === "https" ? "https" : "http";
  const requestOrigin = host ? validOrigin(`${protocol}://${host}`) : null;
  const metadataBase = fixedOrigin ?? requestOrigin ?? new URL(`http://localhost:${process.env.PORT ?? "3000"}`);

  return {
    metadataBase,
    title: {
      default: "NyaNovel — AI image generation",
      template: "%s · NyaNovel",
    },
    description:
      "A fast, refined browser client for NovelAI image generation — prompts, characters, vibe transfer, director tools and a local gallery.",
    applicationName: "NyaNovel",
    icons: {
      icon: [{ url: brandIcon.src, type: "image/png", sizes: "512x512" }],
      apple: [{ url: brandIcon.src, type: "image/png", sizes: "512x512" }],
    },
    openGraph: {
      type: "website",
      siteName: "NyaNovel",
      title: "NyaNovel — AI image generation, refined",
      description: "Fast controls, live streaming, and local-first privacy for NovelAI image generation.",
      images: [{ url: socialBanner.src, width: 1280, height: 640, alt: "NyaNovel — AI image generation, refined" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "NyaNovel — AI image generation, refined",
      description: "Fast controls, live streaming, and local-first privacy for NovelAI image generation.",
      images: [socialBanner.src],
    },
  };
}

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
