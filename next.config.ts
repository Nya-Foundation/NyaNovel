import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NyaNovel is a client-side app: the browser holds the NAI token and calls the
  // NovelAI API directly via nekoai-js, and results live in IndexedDB. No server
  // image pipeline, so nothing to configure for next/image remote patterns yet.
  reactStrictMode: true,
  // Emit a self-contained server bundle for a small production Docker image.
  output: "standalone",
  // Hide the floating dev-tools indicator (keeps the bottom-left corner clean).
  devIndicators: false,
  // Pin the workspace root to this project. Without it, Next walks up and picks
  // ~/package-lock.json as the root, then can't find our bun-installed toolchain
  // and tries to auto-install TypeScript via pnpm mid-build (which then crashes).
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
