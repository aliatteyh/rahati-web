import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLocale } from "@/i18n/config";
import { registerRequest, type RegisterData } from "@/lib/auth";
import { TOKEN_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const data: RegisterData = {
    first_name: String(body.first_name ?? "").trim(),
    last_name: String(body.last_name ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    country_code: String(body.country_code ?? "AE").trim(),
    password: String(body.password ?? ""),
    confirm_password: String(body.confirm_password ?? ""),
  };

  if (!data.first_name || !data.email || !data.phone || !data.password) {
    return NextResponse.json({ ok: false, message: "Missing required fields" }, { status: 400 });
  }
  if (data.password !== data.confirm_password) {
    return NextResponse.json({ ok: false, message: "Passwords do not match" }, { status: 400 });
  }

  const result = await registerRequest(data, locale);
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
  // No token: registration may need OTP/verification — surface the server message.
  return NextResponse.json(
    { ok: false, needsVerification: true, message: result.message ?? "Registration failed" },
    { status: 200 }
  );
}
