import { cookies } from "next/headers";

export { TOKEN_COOKIE } from "./cookies";

/**
 * The proof that the phone being registered answered a one-time code.
 *
 * The backend mints it when a code (or a Firebase phone credential) is
 * verified for a number that has no account yet, and `registration-with-otp`
 * refuses without it - otherwise anybody could create a verified account on
 * somebody else's number and be waiting inside it when they first sign in.
 *
 * httpOnly and short-lived, and never put in a URL: a ticket in a query string
 * ends up in history, in a referrer and in a log.
 */
export const SIGNUP_TICKET_COOKIE = "rahati_signup";
import { TOKEN_COOKIE } from "./cookies";

/** Read the auth token from the httpOnly cookie (server only). */
export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function isLoggedIn(): Promise<boolean> {
  return Boolean(await getToken());
}
