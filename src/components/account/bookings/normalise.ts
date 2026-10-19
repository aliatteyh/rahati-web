import type { BookingRow } from "./types";

/**
 * The booking as the API returns it. Only the parts this screen reads.
 */
export interface ApiBooking {
  id?: string;
  readable_id?: string | number;
  booking_status?: string;
  is_repeated?: number;
  service_schedule?: string | null;
  duration_minutes?: number | null;
  total_booking_amount?: number | string;
  total_tax_amount?: number | string;
  total_discount_amount?: number | string;
  total_campaign_discount_amount?: number | string;
  total_coupon_discount_amount?: number | string;
  total_material_charge?: number | string;
  total_addon_amount?: number | string;
  extra_fee?: number | string;
  additional_charge?: number | string;
  tip_amount?: number | string;
  payment_method?: string;
  is_paid?: number;
  cancelled_by?: string | null;
  service_address_location?: string | null;
  detail?: {
    service_id?: string;
    service_name?: string;
    variant_key?: string;
    professional_count?: number;
    material_charge?: number | string;
    service?: { name?: string } | null;
  }[];
  serviceman?: {
    avg_rating?: number | string;
    rating_count?: number;
    visits_count?: number;
    user?: {
      first_name?: string;
      last_name?: string;
      profile_image_full_path?: string | null;
    } | null;
  } | null;
}

const num = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function toRows(bookings: ApiBooking[]): BookingRow[] {
  return bookings
    .filter((booking) => booking.id)
    .map((booking) => {
      const line = booking.detail?.[0];
      const user = booking.serviceman?.user;
      const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();

      return {
        id: String(booking.id),
        readableId: String(booking.readable_id ?? ""),
        status: booking.booking_status ?? "pending",
        isPlan: Number(booking.is_repeated) === 1,
        serviceName: line?.service?.name ?? line?.service_name ?? "",
        serviceId: String(line?.service_id ?? ""),
        variantKey: String(line?.variant_key ?? ""),
        schedule: booking.service_schedule ?? null,
        durationMinutes: num(booking.duration_minutes),
        cleaners: Math.max(1, Number(line?.professional_count ?? 1)),
        // Two columns hold this, and which one depends on when the booking
        // was placed, so neither alone answers for every booking.
        withMaterials:
          num(booking.total_material_charge) > 0 || num(line?.material_charge) > 0,
        total: num(booking.total_booking_amount),
        subtotal:
          num(booking.total_booking_amount) -
          num(booking.extra_fee) -
          num(booking.total_tax_amount) -
          num(booking.tip_amount),
        fee: num(booking.extra_fee) || num(booking.additional_charge),
        tax: num(booking.total_tax_amount),
        tip: num(booking.tip_amount),
        addOnTotal: num(booking.total_addon_amount),
        discount:
          num(booking.total_discount_amount) +
          num(booking.total_campaign_discount_amount) +
          num(booking.total_coupon_discount_amount),
        paymentMethod: booking.payment_method ?? "",
        isPaid: Number(booking.is_paid) === 1,
        cancelledBy: booking.cancelled_by ?? null,
        address: parseAddress(booking.service_address_location),
        cleaner: name
          ? {
              name,
              image: user?.profile_image_full_path ?? null,
              rating: num(booking.serviceman?.avg_rating),
              ratingCount: Number(booking.serviceman?.rating_count ?? 0),
              visits: Number(booking.serviceman?.visits_count ?? 0),
            }
          : null,
      };
    });
}

/** The address snapshot the booking carries, as parts a screen can print. */
export function parseAddress(stored?: string | null) {
  if (!stored) return null;

  try {
    const raw = JSON.parse(stored) as Record<string, string | null>;
    return {
      label: raw.address_label,
      building: raw.building_name,
      apartment: raw.house,
      floor: raw.floor,
      street: raw.street,
      city: raw.city,
      address: raw.address,
    };
  } catch {
    return null;
  }
}
