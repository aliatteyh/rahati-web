import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLocale } from "@/i18n/config";
import { verifyOtpRequest } from "@/lib/auth";
import { TOKEN_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone ?? "").trim();
  const otp = String(body.otp ?? "").trim();
  const locale = isLocale(body.locale) ? body.locale : "en";

  if (!phone || !otp) {
    return NextResponse.json({ ok: false, message: "Missing code" }, { status: 400 });
  }

  const result = await verifyOtpRequest(phone, otp, locale);
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
    { ok: false, isNewUser: result.isNewUser, message: result.message ?? "Invalid code" },
    { status: 200 }
  );
}
