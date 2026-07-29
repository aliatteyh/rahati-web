import { cookies } from "next/headers";

export const TOKEN_COOKIE = "rahati_token";

/** Read the auth token from the httpOnly cookie (server only). */
export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function isLoggedIn(): Promise<boolean> {
  return Boolean(await getToken());
}
