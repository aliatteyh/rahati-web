/**
 * Cookie names, on their own.
 *
 * `zone.ts` and `session.ts` both read cookies through `next/headers`, which
 * cannot cross into the browser bundle — so a client component that only wanted
 * to know what a cookie is *called* was dragging a server-only API in with it
 * and failing the build. Nothing here imports anything.
 */
export const ZONE_COOKIE = "rahati_zone";
export const TOKEN_COOKIE = "rahati_token";
