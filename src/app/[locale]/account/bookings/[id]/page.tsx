import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";

/**
 * The booking's own page, which is now a sheet on the list.
 *
 * Kept as a redirect rather than deleted: this address is in old links, in
 * the back button of anyone who was on it, and in whatever the customer
 * bookmarked. Landing them on the screen this replaced was the one thing
 * worse than a missing page — it is how the old design kept reappearing
 * after the new one shipped.
 */
export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw } = await params;
  redirect(`/${isLocale(raw) ? raw : "en"}/account/bookings`);
}
