import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "@/i18n/config";

function detectLocale(req: NextRequest): string {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie;

  const accept = req.headers.get("accept-language") ?? "";
  if (accept.toLowerCase().startsWith("ar")) return "ar";
  return defaultLocale;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasLocale = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes, the image proxy, and files with an
  // extension (assets).
  //
  // `media` is named even though almost every path under it ends in `.webp`
  // or `.jpg` and would be skipped by the extension rule anyway: the API does
  // return the occasional stored file with no extension, and redirecting one
  // of those to `/en/media/...` turns a picture into a 404 nobody would think
  // to look for here.
  matcher: ["/((?!_next|api|media|.*\\..*).*)"],
};
