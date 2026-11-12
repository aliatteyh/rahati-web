import type { Locale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/**
 * The right to open the backend's hosted payment page.
 *
 * That page has no session of its own — it opens in a browser tab, hands off
 * to a gateway and comes back — so it used to take the payer's identity from
 * its own URL: `access_token=base64(user id)`. That is not a token. Anyone
 * holding a customer's id could open a payment in that customer's name, with
 * an amount of their choosing, and the gateway charge would land on Rahati.
 *
 * So the bearer token is spent here instead. The server reads who the
 * customer is from it and answers with an opaque id that means nothing
 * anywhere else, and the payment page trusts that rather than the link.
 */
export async function openPaymentSession(locale: Locale): Promise<string | null> {
  const { ok, json } = await authSend("POST", "/api/v1/customer/payment/session", {}, locale);

  const session = (json as { content?: { session?: unknown } })?.content?.session;

  return ok && typeof session === "string" && session !== "" ? session : null;
}
