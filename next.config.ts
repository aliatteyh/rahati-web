import type { NextConfig } from "next";

/**
 * Images are served by this site, not fetched from the panel's host — but the
 * machinery for that is a route handler at `src/app/media/[...path]/route.ts`,
 * not a rewrite here.
 *
 * A rewrite was the obvious shape and it was the wrong one: an external
 * rewrite proxies the upstream response with the upstream's own headers, and
 * measured on 2026-11-19 the image came back carrying Apache's headers and no
 * `Cache-Control` at all. That moves every image request onto Vercel without
 * caching any of it — the same load on the backend, no closer to anybody, and
 * the whole point of the change lost. The route handler owns its response, so
 * it can say how long the edge may keep it.
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
