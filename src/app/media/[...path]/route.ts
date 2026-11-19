import { NextResponse } from "next/server";

/**
 * Every picture on this site, served from this site.
 *
 * The API returns absolute image URLs on the panel's host, so pages came from
 * the edge while every picture on them was fetched by the visitor's own browser
 * from one shared-hosting machine. `src/lib/media.ts` rewrites those URLs to
 * `/media/...` on the way out of the API layer; this is the other half.
 *
 * It exists as a route handler rather than a `next.config` rewrite because a
 * rewrite proxies the upstream response **with the upstream's headers** —
 * measured on 2026-11-19 against the dev server, the proxied image came back
 * carrying Apache's headers and no `Cache-Control` at all. That would have
 * moved every image request from the visitor to Vercel without caching any of
 * it: the same load on the backend, no closer to anybody. Caching is the point,
 * so the response has to be ours to write.
 *
 * Scoped to `storage/app/public/` and nothing wider. Pointing this at the API
 * root would republish the whole backend under this domain, including the paths
 * its own `.htaccess` refuses — handing back the hardening it just gained.
 */

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com"
).replace(/\/+$/, "");

/**
 * An hour at the edge, then a week of serving the old copy while the new one
 * is fetched behind the visitor.
 *
 * Most of these filenames carry their upload date and never change content, so
 * they could be cached far longer. A few are fixed names whose bytes an admin
 * can replace, and an image a week stale after somebody deliberately changed it
 * is a support call. `max-age=0` keeps the visitor's own browser asking this
 * site, so a purge here reaches everyone; `s-maxage` is what the CDN honours.
 */
const CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800";

/** Types a customer-facing image endpoint may serve. Anything else is refused. */
const ALLOWED = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "application/pdf",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // `..` cannot appear in a Next catch-all segment, but the check is cheap and
  // this builds a URL on another host — the one place where being wrong about
  // that would matter.
  if (
    !path?.length ||
    path.some((part) => !part || part === "." || part === "..")
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const target = `${API_BASE}/storage/app/public/${path
    .map(encodeURIComponent)
    .join("/")}`;

  let upstream: Response;

  try {
    upstream = await fetch(target, {
      // Revalidated on the server as well as at the edge, so a replaced image
      // is picked up without a deploy.
      next: { revalidate: 3600 },
    });
  } catch {
    // The backend being unreachable is exactly the case this route was built
    // for. It cannot show the picture, but it must not take the page down with
    // it, and it must not hang: a failed image is a gap, not a stalled render.
    return new NextResponse(null, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  const type = (upstream.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  // A path under public storage that answers with HTML is an error page or a
  // directory listing, not a picture. Passing it through would publish the
  // backend's own pages under this domain.
  if (!ALLOWED.has(type)) {
    return new NextResponse(null, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": type,
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  });

  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new NextResponse(upstream.body, { status: 200, headers });
}
