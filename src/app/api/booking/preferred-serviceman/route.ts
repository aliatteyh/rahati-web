import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authGet } from "@/lib/account";
import { getToken } from "@/lib/session";

export interface PreferredServiceman {
  id: string;
  name: string;
  image: string | null;
  rating: number;
  rating_count: number;
  visits: number;
}

/**
 * The serviceman who came last time, for the booking screen to show.
 *
 * Answers with null rather than an error for a customer who is not signed in or
 * has never booked this service — both are ordinary, and the card simply does
 * not appear. Nothing on the page may depend on this returning anything.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subCategoryId = searchParams.get("sub_category_id") ?? "";
  const raw = searchParams.get("locale") ?? "";
  const locale = isLocale(raw) ? raw : "en";

  if (!subCategoryId || !(await getToken())) {
    return NextResponse.json({ serviceman: null });
  }

  const serviceman = await authGet<PreferredServiceman | null>(
    `/api/v1/customer/booking/preferred-serviceman?sub_category_id=${encodeURIComponent(subCategoryId)}`,
    locale,
    null as PreferredServiceman | null
  );

  return NextResponse.json({ serviceman });
}
