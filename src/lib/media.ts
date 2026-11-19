/**
 * Images come through this site, not from the panel's host.
 *
 * The API returns absolute image URLs — `image_full_path`,
 * `cover_image_full_path`, `profile_image_full_path` and a dozen more — all
 * pointing straight at the backend. Pages were served from the edge while
 * every picture on them was fetched by the visitor's own browser from one
 * shared-hosting box.
 *
 * That showed itself on 2026-11-18, when that host firewalled an office IP:
 * the site still rendered, because the HTML comes from here and the API calls
 * are made server-side, and every image on it hung for twenty-one seconds and
 * then failed. One blocked address, and the site looked broken.
 *
 * It is also simply slower for everyone. An image is a cacheable byte range
 * with a dated filename; served through this origin it is cached at the edge,
 * close to the visitor, instead of being fetched from a single machine on
 * every page view.
 *
 * So the rewriting happens once, here, on the way out of the API layer:
 * anything under the backend's public storage becomes a `/media/...` path on
 * this site, and `next.config.ts` proxies that back to the same file. Nothing
 * in a component changes — there are seventy-eight places that render one of
 * these URLs, and a rule applied in seventy-eight places is a rule with
 * seventy-eight chances to be forgotten.
 *
 * A URL that is **not** under that prefix is left exactly as it was. Logos
 * hosted elsewhere, data URIs, and anything the API starts returning tomorrow
 * keep working untouched; the proxy is an improvement, never a requirement.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/** Where the backend keeps everything a customer is allowed to see. */
const REMOTE_PREFIX = `${API_BASE.replace(/\/+$/, "")}/storage/app/public/`;

/** The path on this site that proxies it. */
export const MEDIA_PREFIX = "/media/";

/** One URL. Returns it unchanged unless it is a public storage file. */
export function mediaUrl<T extends string | null | undefined>(url: T): T {
  if (typeof url !== "string" || !url.startsWith(REMOTE_PREFIX)) {
    return url;
  }

  return (MEDIA_PREFIX + url.slice(REMOTE_PREFIX.length)) as T;
}

/**
 * Every URL inside a parsed response, however deep.
 *
 * Walks the structure rather than running a regex over the raw text, because
 * the payloads carry customer-written content — an address, a review, a chat
 * message — and a blind string replace over a JSON document would rewrite a
 * link somebody typed as well as the fields we mean.
 *
 * Returns the value it was given when nothing matched, so an unchanged
 * response is not copied for no reason. Cycles cannot occur in parsed JSON, so
 * the walk needs no seen-set.
 */
export function viaThisSite<T>(value: T): T {
  if (typeof value === "string") {
    return mediaUrl(value) as T;
  }

  if (Array.isArray(value)) {
    let changed = false;

    const next = value.map((item) => {
      const mapped = viaThisSite(item);
      if (mapped !== item) changed = true;
      return mapped;
    });

    return (changed ? next : value) as T;
  }

  if (value && typeof value === "object") {
    let changed = false;
    const source = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const mapped = viaThisSite(source[key]);
      if (mapped !== source[key]) changed = true;
      next[key] = mapped;
    }

    return (changed ? next : value) as T;
  }

  return value;
}
