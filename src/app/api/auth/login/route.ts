import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLocale } from "@/i18n/config";
import { loginRequest } from "@/lib/auth";
import { TOKEN_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const emailOrPhone = String(body.emailOrPhone ?? "").trim();
  const password = String(body.password ?? "");
  const locale = isLocale(body.locale) ? body.locale : "en";

  if (!emailOrPhone || !password) {
    return NextResponse.json({ ok: false, message: "Missing credentials" }, { status: 400 });
  }

  const result = await loginRequest(emailOrPhone, password, locale);
  if (result.ok && result.token) {
    const store = await cookies();
    store.set(TOKEN_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { ok: false, message: result.message ?? "Login failed" },
    { status: 401 }
  );
}
