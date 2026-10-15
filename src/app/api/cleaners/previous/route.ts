import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authGetList } from "@/lib/account";

/**
 * The cleaners who have already worked in this customer's home.
 *
 * "My favourite" means nothing without them: nobody can ask for someone by
 * name if the site never shows the names of the people who came. Signed-in
 * only, and an empty list is an ordinary answer for a first booking.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const cleaners = await authGetList<{
    id?: string;
    name?: string;
    image_full_path?: string | null;
    avg_rating?: string | number;
    rating_count?: number;
  }>("/api/v1/customer/serviceman/previous", locale);

  return NextResponse.json({ cleaners });
}
