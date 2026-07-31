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
  fallback: T
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

export function getConfig(locale: Locale): Promise<BusinessConfig> {
  return apiGet<BusinessConfig>("/api/v1/customer/config", locale, {});
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
