import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * Product images live in Cloudflare R2 (media module); the image optimizer may
 * only fetch them from the configured public base URL.
 */
function r2ImagePatterns(): Array<URL | RemotePattern> {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return [];
  const url = new URL(base);
  const pathname = `${url.pathname.replace(/\/+$/, "")}/**`;
  return [new URL(pathname, url.origin)];
}

const nextConfig: NextConfig = {
  // The E2E build goes to its own directory so it does not trigger a running `next dev` that watches .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  experimental: {
    agentUpgrade: "security",
  },
  images: {
    remotePatterns: r2ImagePatterns(),
  },
};

export default nextConfig;
