import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLocale } from "@/i18n/config";
import { registerOtpRequest, type OtpRegisterData } from "@/lib/auth";
import { SIGNUP_TICKET_COOKIE, TOKEN_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  // The ticket, from the cookie the verify step set - never from the body, so
  // a caller cannot supply one for a number they did not prove.
  const store = await cookies();
  const ticket = store.get(SIGNUP_TICKET_COOKIE)?.value ?? "";

  if (!ticket) {
    return NextResponse.json(
      { ok: false, reason: "verify_again", message: "Please verify your phone number again." },
      { status: 400 }
    );
  }

  const data: OtpRegisterData = {
    temporary_token: ticket,
    first_name: String(body.first_name ?? "").trim(),
    last_name: String(body.last_name ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    city: String(body.city ?? "").trim() || undefined,
    area: String(body.area ?? "").trim() || undefined,
    building: String(body.building ?? "").trim() || undefined,
    floor: String(body.floor ?? "").trim() || undefined,
    apartment: String(body.apartment ?? "").trim() || undefined,
    lat: Number.isFinite(body.lat) ? Number(body.lat) : undefined,
    lon: Number.isFinite(body.lon) ? Number(body.lon) : undefined,
  };

  if (!data.first_name || !data.last_name || !data.phone || !data.email) {
    return NextResponse.json({ ok: false, message: "Missing required fields" }, { status: 400 });
  }

  const result = await registerOtpRequest(data, locale);
  if (result.ok && result.token) {
    // Spent: the account exists now.
    store.delete(SIGNUP_TICKET_COOKIE);
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
    { ok: false, message: result.message ?? "Registration failed" },
    { status: 200 }
  );
}
