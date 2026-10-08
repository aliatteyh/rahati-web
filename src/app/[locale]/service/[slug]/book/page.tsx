import { redirect } from "next/navigation";

/**
 * The booking form no longer has a page of its own.
 *
 * Choosing a service now lands on the service page with the form on it, and
 * the information underneath — so there is nothing left here to show. The
 * route stays as a forward rather than a 404: offer links already sent out,
 * a customer's bookmark and the app's own deep links all still point at it,
 * and every one of them carries the query the form reads (`package`,
 * `variant`, `hours`, `offer`), which is passed on untouched.
 */
export default async function BookRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  const search = await searchParams;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }

  const tail = query.toString();
  redirect(`/${locale}/service/${slug}${tail ? `?${tail}` : ""}#book`);
}
