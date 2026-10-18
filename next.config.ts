import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * Product images live in Cloudflare R2 (media module); the image optimizer may
 * only fetch them from the configured public base URL.
 */
function r2ImagePatterns(): Array<URL | RemotePattern> {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return [];
  return [new URL(`${pathnameOf(base)}/**`, originOf(base))];
}

function originOf(base: string): string {
  const url = new URL(base);
  return url.origin;
}

function pathnameOf(base: string): string {
  return new URL(base).pathname.replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: r2ImagePatterns(),
  },
};

export default nextConfig;
