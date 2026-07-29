import type { Locale } from "@/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

async function authPost(
  path: string,
  body: Record<string, unknown>,
  locale: Locale,
  token?: string
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-localization": locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: {} };
  }
}

function extractMessage(json: Record<string, unknown>): string | undefined {
  const errors = json?.errors as Array<{ message?: string }> | undefined;
  return (json?.message as string) ?? errors?.[0]?.message;
}

export interface AuthResult {
  ok: boolean;
  token?: string;
  message?: string;
}

export async function loginRequest(
  emailOrPhone: string,
  password: string,
  locale: Locale
): Promise<AuthResult> {
  // The customer login endpoint requires `type` (phone|email) and a `guest_id` uuid.
  const type = emailOrPhone.includes("@") ? "email" : "phone";
  const { json } = await authPost(
    "/api/v1/customer/auth/login",
    { email_or_phone: emailOrPhone, password, type, guest_id: crypto.randomUUID() },
    locale
  );
  const content = (json?.content ?? {}) as { token?: string };
  const token = content?.token;
  return { ok: Boolean(token), token, message: extractMessage(json) };
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country_code: string;
  password: string;
  confirm_password: string;
}

export async function registerRequest(
  data: RegisterData,
  locale: Locale
): Promise<AuthResult> {
  const { json } = await authPost(
    "/api/v1/customer/auth/registration",
    data as unknown as Record<string, unknown>,
    locale
  );
  const content = (json?.content ?? {}) as { token?: string };
  const token = content?.token;
  // Some setups return a token on register; others require OTP verification first.
  return { ok: Boolean(token), token, message: extractMessage(json) };
}

export interface OtpRegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city?: string;
  area?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  lat?: number;
  lon?: number;
}

/**
 * Create a passwordless customer account after phone OTP verification.
 * The backend sets a random password and returns an app token.
 */
export async function registerOtpRequest(
  data: OtpRegisterData,
  locale: Locale
): Promise<AuthResult> {
  const { json } = await authPost(
    "/api/v1/user/verification/registration-with-otp",
    { ...data, guest_id: crypto.randomUUID() } as unknown as Record<string, unknown>,
    locale
  );
  const content = (json?.content ?? {}) as { token?: string };
  const token = content?.token;
  return { ok: Boolean(token), token, message: extractMessage(json) };
}

export async function logoutRequest(token: string, locale: Locale): Promise<void> {
  await authPost("/api/v1/customer/auth/logout", {}, locale, token);
}

/** Send a login OTP to an existing customer's phone. */
export async function sendOtpRequest(
  phone: string,
  locale: Locale
): Promise<{ ok: boolean; message?: string }> {
  const { ok, json } = await authPost(
    "/api/v1/user/verification/send-otp",
    { identity: phone, identity_type: "phone", check_user: 1 },
    locale
  );
  return { ok, message: extractMessage(json) };
}

export interface OtpVerifyResult extends AuthResult {
  isNewUser?: boolean;
  temporaryToken?: string;
}

/** Verify a Firebase phone-auth session on the backend; returns the app token. */
export async function firebaseVerifyRequest(
  sessionInfo: string,
  phoneNumber: string,
  code: string,
  locale: Locale
): Promise<OtpVerifyResult> {
  const { json } = await authPost(
    "/api/v1/user/verification/firebase-auth-verify",
    { sessionInfo, phoneNumber, code, user_type: "customer" },
    locale
  );
  const content = (json?.content ?? {}) as {
    token?: string;
    temporary_token?: string;
    status?: boolean;
  };
  const token = content?.token;
  // No token but a temporary_token / status:false => the phone isn't a
  // registered customer yet; the caller should route to sign-up.
  const isNewUser = !token && (content?.status === false || Boolean(content?.temporary_token));
  return {
    ok: Boolean(token),
    token,
    isNewUser,
    temporaryToken: content?.temporary_token,
    message: extractMessage(json),
  };
}

/** Verify the login OTP; returns a token for existing customers. */
export async function verifyOtpRequest(
  phone: string,
  otp: string,
  locale: Locale
): Promise<OtpVerifyResult> {
  const { json } = await authPost(
    "/api/v1/user/verification/login-otp-verify",
    { phone, otp },
    locale
  );
  const content = (json?.content ?? {}) as { token?: string; status?: boolean };
  const token = content?.token;
  return {
    ok: Boolean(token),
    token,
    message: extractMessage(json),
    isNewUser: content?.status === false && !token,
  };
}
