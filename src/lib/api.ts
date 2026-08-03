import type { Locale } from "@/i18n/config";
import { getZoneId } from "./zone";
import type {
  AddOn,
  Banner,
  BusinessConfig,
  Category,
  Service,
  ServiceRating,
  ServiceReview,
  SubcategoryWithServices,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/** Revalidate remote data every 5 minutes (ISR) — fresh enough, great for SEO. */
const REVALIDATE_SECONDS = 300;

async function apiGet<T>(
  path: string,
  locale: Locale,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  try {
    const zoneId = await getZoneId();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        "X-localization": locale,
        zoneId,
      },
      next: { revalidate: REVALIDATE_SECONDS },
      ...init,
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    return (json?.content ?? json) as T;
  } catch {
    return fallback;
  }
}

/** Paginated endpoints wrap rows in content.data */
async function apiGetList<T>(
  path: string,
  locale: Locale
): Promise<T[]> {
  const content = await apiGet<{ data?: T[] } | T[]>(path, locale, []);
  if (Array.isArray(content)) return content;
  return content?.data ?? [];
}

/**
 * Business config — fees, tax rate, material rate, discount tiers.
 *
 * Deliberately uncached. Everything here sets a price, so a cached copy shows
 * the customer one number in the line items while the server charges another,
 * and an admin editing a rate sees no change until the window expires.
 */
export function getConfig(locale: Locale): Promise<BusinessConfig> {
  return apiGet<BusinessConfig>("/api/v1/customer/config", locale, {}, { cache: "no-store" });
}

export function getBanners(locale: Locale, limit = 10): Promise<Banner[]> {
  return apiGetList<Banner>(
    `/api/v1/customer/banner?limit=${limit}&offset=1`,
    locale
  );
}

export function getCategories(locale: Locale, limit = 100): Promise<Category[]> {
  return apiGetList<Category>(
    `/api/v1/customer/category?limit=${limit}&offset=1`,
    locale
  );
}

export function getPopularServices(locale: Locale, limit = 8): Promise<Service[]> {
  return apiGetList<Service>(
    `/api/v1/customer/service/popular?limit=${limit}&offset=1`,
    locale
  );
}

export function getSubcategories(slug: string, locale: Locale): Promise<Category[]> {
  return apiGetList<Category>(
    `/api/v1/customer/category/childes?limit=50&offset=1&slug=${encodeURIComponent(slug)}`,
    locale
  );
}

export async function getCategoryBySlug(
  slug: string,
  locale: Locale
): Promise<Category | undefined> {
  const categories = await getCategories(locale);
  return categories.find((c) => c.slug === slug);
}

export function getServicesBySubcategory(
  slug: string,
  locale: Locale,
  limit = 12
): Promise<Service[]> {
  return apiGetList<Service>(
    `/api/v1/customer/service/sub-category/${encodeURIComponent(slug)}?limit=${limit}&offset=1`,
    locale
  );
}

/** For each subcategory of a category, load its services (parallel). */
export async function getCategoryContents(
  categorySlug: string,
  locale: Locale
): Promise<SubcategoryWithServices[]> {
  const subcategories = await getSubcategories(categorySlug, locale);
  const results = await Promise.all(
    subcategories.map(async (subcategory) => ({
      subcategory,
      services: await getServicesBySubcategory(subcategory.slug, locale),
    }))
  );
  return results;
}

export function getServiceDetail(
  slug: string,
  locale: Locale
): Promise<Service | undefined> {
  return apiGet<Service | undefined>(
    `/api/v1/customer/service/detail/${encodeURIComponent(slug)}`,
    locale,
    undefined
  );
}

export function getServiceAddOns(
  serviceId: string,
  locale: Locale
): Promise<AddOn[]> {
  return apiGetList<AddOn>(
    `/api/v1/customer/service/add-ons/${encodeURIComponent(serviceId)}`,
    locale
  );
}

export interface CouponResult {
  valid: boolean;
  discount_amount: number;
  coupon_code?: string;
  message?: string;
}

export interface ServicePackageTier {
  days_per_week: number;
  /** What the package is sold by: 4, 8, 12, 16, 20 or 24 services a month. */
  visits_per_month?: number;
  discount_percent: number;
  price_override: number | null;
}

export interface ServicePackage {
  id: string;
  name: string;
  badge_text: string | null;
  short_description: string | null;
  validity_months: number;
  min_days_per_week: number;
  max_days_per_week: number;
  max_discount_percent: number;
  allow_prepaid: number;
  allow_pay_per_visit: number;
  tiers: ServicePackageTier[];
}

/** Packages a customer can buy for this sub-category, in their zone. */
export async function getServicePackages(
  subCategoryId: string,
  locale: Locale
): Promise<ServicePackage[]> {
  try {
    const zoneId = await getZoneId();
    const res = await fetch(
      `${API_BASE}/api/v1/customer/service-package?sub_category_id=${encodeURIComponent(subCategoryId)}`,
      {
        headers: { Accept: "application/json", "X-localization": locale, zoneId },
        cache: "no-store",
      }
    );
    const json = await res.json();
    return Array.isArray(json?.content) ? (json.content as ServicePackage[]) : [];
  } catch {
    // A missing catalogue must not take the booking page down with it.
    return [];
  }
}

export interface PackageQuote {
  valid: boolean;
  reason?: string;
  package_name: string;
  validity_months: number;
  days_per_week: number;
  weekdays: number[];
  skipped_off_days: number;
  total_visits: number;
  discount_percent: number;
  undiscounted_visit_price: number;
  net_visit_price: number;
  you_save: number;
  dates: string[];
  first_visit: string;
  last_visit: string;
  grand_total: number;
}

/** The weekdays still bookable once the provider's off day is removed. */
/**
 * Which weekdays this sub-category can actually be booked on.
 *
 * Ask by sub-category, not by provider: a day is only closed when every
 * provider serving it is off. Asking about one provider blocked days a
 * colleague could have covered.
 */
export async function getPackageAvailability(
  subCategoryId: string | null,
  locale: Locale
): Promise<{
  selectable_weekdays: number[];
  off_days_iso: number[];
  max_days_per_week: number;
  provider_count?: number;
}> {
  const fallback = { selectable_weekdays: [1, 2, 3, 4, 5, 6, 7], off_days_iso: [], max_days_per_week: 6 };
  try {
    const zoneId = await getZoneId();
    const query = subCategoryId ? `?sub_category_id=${encodeURIComponent(subCategoryId)}` : "";
    const res = await fetch(`${API_BASE}/api/v1/customer/service-package/availability${query}`, {
      headers: { Accept: "application/json", "X-localization": locale, zoneId },
      cache: "no-store",
    });
    const json = await res.json();
    return json?.content ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Price a package for a concrete schedule.
 *
 * Returns the actual visit dates as well as the money — the customer is buying
 * "Mon/Wed for a month, 10 visits, these dates", not an abstract count, and the
 * count is what they are charged for.
 */
export async function fetchPackageQuote(
  packageId: string,
  input: {
    startDate: string;
    time: string;
    weekdays: number[];
    serviceId: string;
    variantKey: string;
    providerId?: string | null;
    professionalCount?: number;
    needMaterials?: boolean;
    addOns?: { id: string; quantity: number }[];
  },
  locale: Locale
): Promise<PackageQuote | null> {
  try {
    const zoneId = await getZoneId();
    const res = await fetch(`${API_BASE}/api/v1/customer/service-package/${packageId}/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-localization": locale,
        zoneId,
      },
      body: JSON.stringify({
        start_date: input.startDate,
        time: input.time,
        weekdays: input.weekdays,
        service_id: input.serviceId,
        variant_key: input.variantKey,
        provider_id: input.providerId ?? null,
        zone_id: zoneId,
        quantity: 1,
        professional_count: input.professionalCount ?? 1,
        need_materials: input.needMaterials ? 1 : 0,
        add_ons: input.addOns ?? [],
      }),
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.response_code !== "default_200" || !json?.content) return null;
    return json.content as PackageQuote;
  } catch {
    return null;
  }
}

export interface BookingQuote {
  occurrences: number;
  per_occurrence: number;
  extra_fee: number;
  referral_discount: number;
  pro_discount: number;
  /** Server-computed, so the shown line can never disagree with the total. */
  professional_discount: number;
  material_charge: number;
  commitment_percent: number;
  commitment_discount: number;
  total_discount_amount: number;
  total_tax_amount: number;
  grand_total: number;
}

export interface QuoteInput {
  dates: string[];
  serviceId: string;
  variantKey: string;
  quantity: number;
  professionalCount: number;
  needMaterials: boolean;
  addOns: { id: string; quantity: number }[];
}

/**
 * Price a recurring booking on the server.
 *
 * The wizard used to reproduce the backend's discount and tax rules in
 * TypeScript, so a rule change in one place silently disagreed with the other.
 * The total shown now comes from the same calculator that charges the customer.
 */
export async function fetchBookingQuote(
  input: QuoteInput,
  locale: Locale
): Promise<BookingQuote | null> {
  try {
    const zoneId = await getZoneId();
    const res = await fetch(`${API_BASE}/api/v1/customer/booking/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-localization": locale,
        zoneId,
      },
      body: JSON.stringify({
        dates: JSON.stringify(input.dates),
        zone_id: zoneId,
        service_id: input.serviceId,
        variant_key: input.variantKey,
        quantity: input.quantity,
        professional_count: input.professionalCount,
        need_materials: input.needMaterials ? 1 : 0,
        add_ons: input.addOns,
      }),
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.response_code !== "default_200" || !json?.content) return null;
    return json.content as BookingQuote;
  } catch {
    return null;
  }
}

/** Validate a coupon against a service (server-side; called from the /api/coupon route). */
export async function validateCoupon(
  couponCode: string,
  serviceId: string,
  amount: number,
  locale: Locale
): Promise<CouponResult> {
  try {
    const zoneId = await getZoneId();
    const res = await fetch(`${API_BASE}/api/v1/customer/coupon/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-localization": locale,
        zoneId,
      },
      body: JSON.stringify({
        coupon_code: couponCode,
        service_id: serviceId,
        amount,
      }),
      cache: "no-store",
    });
    const json = await res.json();
    const content = (json?.content ?? json ?? {}) as Partial<CouponResult>;
    return {
      valid: Boolean(content.valid),
      discount_amount: Number(content.discount_amount ?? 0),
      coupon_code: content.coupon_code,
      message: content.message,
    };
  } catch {
    return { valid: false, discount_amount: 0, message: "Could not validate coupon" };
  }
}

export async function getServiceReviews(
  serviceId: string,
  locale: Locale
): Promise<{ rating: ServiceRating; reviews: ServiceReview[] }> {
  const content = await apiGet<{
    rating?: ServiceRating;
    reviews?: { data?: ServiceReview[] } | ServiceReview[];
  }>(
    `/api/v1/customer/service/review/${encodeURIComponent(serviceId)}?limit=20&offset=1`,
    locale,
    {}
  );
  const reviews = Array.isArray(content.reviews)
    ? content.reviews
    : (content.reviews?.data ?? []);
  return { rating: content.rating ?? {}, reviews };
}

/** Format a raw price string/number using the config currency. */
export function formatPrice(
  value: number | string | undefined | null,
  currency: string
): string | null {
  if (value === undefined || value === null || value === "") return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  const rounded = Number.isInteger(num) ? num : Math.round(num * 100) / 100;
  return `${currency} ${rounded.toLocaleString()}`;
}

/**
 * The "from" price shown on cards/detail = the cheapest real, bookable option.
 * Prefer the minimum variation price (what a customer can actually book) and
 * ignore `min_bidding_price` (a bidding-system floor, not a fixed price); fall
 * back to starting_price/price, and only then min_bidding_price as a last resort.
 */
export function serviceFromPrice(service: {
  variations?: { price?: number | string | null }[];
  starting_price?: number | string | null;
  price?: number | string | null;
  min_bidding_price?: number | string | null;
}): number {
  const variationPrices = (service.variations ?? [])
    .map((v) => Number(v?.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (variationPrices.length) return Math.min(...variationPrices);
  const fallback = Number(
    service.starting_price ?? service.price ?? service.min_bidding_price ?? 0
  );
  return Number.isFinite(fallback) ? fallback : 0;
}
