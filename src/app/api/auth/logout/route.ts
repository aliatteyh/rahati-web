import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLocale } from "@/i18n/config";
import { logoutRequest } from "@/lib/auth";
import { TOKEN_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (token) {
    await logoutRequest(token, locale);
  }
  store.delete(TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
