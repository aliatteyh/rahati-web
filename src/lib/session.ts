import { cookies } from "next/headers";

export { TOKEN_COOKIE } from "./cookies";
import { TOKEN_COOKIE } from "./cookies";

/** Read the auth token from the httpOnly cookie (server only). */
export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function isLoggedIn(): Promise<boolean> {
  return Boolean(await getToken());
}
