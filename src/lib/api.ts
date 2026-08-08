import type { Locale } from "@/i18n/config";
import { getZoneId, getCustomerCoords } from "./zone";
import { getToken } from "./session";
import { authSend } from "./account";
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
      // Only one caching directive may be given: spreading `init` over a
      // `next.revalidate` left both set, which Next warns about and resolves
      // unpredictably. An explicit `cache` from the caller wins outright.
      ...(init?.cache ? {} : { next: { revalidate: REVALIDATE_SECONDS } }),
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

/**
 * Categories that actually have something to book.
 *
 * A category with no service behind it is a door onto an empty room: the
 * customer picks it, waits for a page, and is told there is nothing here. The
 * catalogue is built long before it is filled, so empty categories are normal
 * and simply should not be offered yet.
 *
 * Emptiness is decided from the service list rather than by walking each
 * category's sub-categories — one request instead of one per category, and it
 * answers the question that matters: is there a service a customer could book
 * under this heading, in this zone, today.
 *
 * Order is preserved, so whatever the caller arranged — featured first — still
 * holds. If the service list cannot be read the categories are returned
 * untouched: showing a category that turns out to be empty is a much smaller
 * failure than showing none at all.
 */
export async function withBookableServices(
  categories: Category[],
  locale: Locale
): Promise<Category[]> {
  const services = await apiGetList<Service>(
    "/api/v1/customer/service?limit=200&offset=1",
    locale
  );

  if (services.length === 0) return categories;

  const stocked = new Set(services.map((s) => s.category_id).filter(Boolean));
  return categories.filter((c) => stocked.has(c.id));
}

/**
 * Categories the admin has flagged as featured.
 *
 * Separate from the ordinary list on purpose: `is_featured` is an editorial
 * decision about what to lead with, and it was being set in the admin and
 * ignored by the site.
 */
export function getFeaturedCategories(locale: Locale, limit = 8): Promise<Category[]> {
  return apiGetList<Category>(
    `/api/v1/customer/featured-categories?limit=${limit}&offset=1`,
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

/**
 * Search services by name.
 *
 * The site had no search at all — a customer who knew what they wanted had to
 * find it by guessing which category it lived under. POST rather than GET
 * because that is what the endpoint accepts.
 */
export async function searchServices(
  query: string,
  locale: Locale,
  limit = 24
): Promise<Service[]> {
  const term = query.trim();
  if (!term) return [];
  try {
    const zoneId = await getZoneId();
    // Signed in, the backend records the term against the customer — which is
    // what fills their recent searches and the admin's keyword analytics. Signed
    // out the search still runs; it simply leaves no trace, which is the right
    // default for someone who has not identified themselves.
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/v1/customer/service/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-localization": locale,
        zoneId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ string: term, limit, offset: 1 }),
      cache: "no-store",
    });
    const json = await res.json();
    // The envelope wraps the paginator under `services`, alongside price filters
    // this page does not use.
    const services = json?.content?.services;
    return (Array.isArray(services) ? services : services?.data ?? []) as Service[];
  } catch {
    return [];
  }
}

/** One term the customer searched before. */
export interface RecentSearch {
  id: string;
  keyword: string;
}

/**
 * The customer's own recent search terms.
 *
 * Deliberately not `authGet`: that redirects to the login page when there is no
 * token, and the search page is public. Here a missing token simply means no
 * history, and the page renders exactly as it always did. The endpoint also
 * answers 404 rather than an empty list when nothing has been searched yet.
 */
export async function getRecentSearches(locale: Locale, limit = 8): Promise<RecentSearch[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    const zoneId = await getZoneId();
    const res = await fetch(
      `${API_BASE}/api/v1/customer/recently-searched-keywords?limit=${limit}&offset=1`,
      {
        headers: {
          Accept: "application/json",
          "X-localization": locale,
          Authorization: `Bearer ${token}`,
          zoneId,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const rows = json?.content?.data ?? json?.content ?? [];
    if (!Array.isArray(rows)) return [];

    // The same term searched twice is two rows; the customer wants one chip.
    const seen = new Set<string>();
    return rows.filter((r: RecentSearch) => {
      const key = (r?.keyword ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
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

/**
 * A promotional campaign: a discount the admin runs over a set of services or
 * categories for a period.
 *
 * The discount itself is already applied at the point of sale — CartLineBuilder
 * takes the greater of the service and campaign discounts. What was missing was
 * anywhere for the customer to see the campaign, so a running promotion reached
 * them only if they happened to open one of its services.
 */
export interface Campaign {
  id: string;
  campaign_name: string;
  cover_image_full_path?: string | null;
  thumbnail_full_path?: string | null;
  discount?: {
    discount_title?: string;
    discount_amount?: number | string;
    discount_amount_type?: string;
    start_date?: string;
    end_date?: string;
  } | null;
}

/** Live campaigns for the customer's zone. */
export function getCampaigns(locale: Locale, limit = 10): Promise<Campaign[]> {
  return apiGetList<Campaign>(
    `/api/v1/customer/campaign?limit=${limit}&offset=1`,
    locale
  );
}

/** The services a campaign covers. Rows carry either a service or a category. */
export interface CampaignItem {
  id: string;
  discount_type: string;
  service?: Service | null;
  category?: Category | null;
}

export function getCampaignItems(
  campaignId: string,
  locale: Locale,
  limit = 50
): Promise<CampaignItem[]> {
  return apiGetList<CampaignItem>(
    `/api/v1/customer/campaign/data/items?campaign_id=${encodeURIComponent(campaignId)}&limit=${limit}&offset=1`,
    locale
  );
}

/**
 * A provider's advertisement — a promotion the admin approves and the customer
 * sees on the home page.
 *
 * Not a banner: a banner is the platform talking, an advertisement is a named
 * provider talking, so it carries their identity and leads to their profile.
 * The backend already scopes the list to the provider's zone, which is what
 * keeps a Dubai promotion out of an Abu Dhabi customer's home page.
 */
export interface Advertisement {
  id: string;
  title?: string;
  description?: string;
  default_title?: string;
  default_description?: string;
  provider_id?: string;
  /**
   * The artwork arrives flattened onto the advertisement, not under
   * `attachments`: the controller copies each attachment's path up to these
   * fields and then unsets the relation before responding.
   */
  provider_cover_image_full_path?: string | null;
  provider_profile_image_full_path?: string | null;
  promotional_video_full_path?: string | null;
  provider_rating?: number | null;
  provider_review?: number | null;
  provider?: {
    id?: string;
    company_name?: string;
    avg_rating?: number;
    rating_count?: number;
  } | null;
}

/** Live advertisements for the customer's zone. */
export function getAdvertisements(locale: Locale, limit = 10): Promise<Advertisement[]> {
  return apiGetList<Advertisement>(
    `/api/v1/customer/advertisements/ads-list?limit=${limit}&offset=1`,
    locale
  );
}


/** One published article. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail_full_path?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  published_at?: string | null;
  click_count?: number;
  category?: { name?: string; slug?: string } | null;
  author?: { name?: string } | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  blogs_count?: number;
}

/** Published articles, newest first, optionally within one category. */
export function getBlogPosts(
  locale: Locale,
  { limit = 12, offset = 1, categorySlug }: { limit?: number; offset?: number; categorySlug?: string } = {}
): Promise<BlogPost[]> {
  const category = categorySlug ? `&category_slug=${encodeURIComponent(categorySlug)}` : "";
  return apiGetList<BlogPost>(
    `/api/v1/customer/blog?limit=${limit}&offset=${offset}${category}`,
    locale
  );
}

/** Categories that actually have something published behind them. */
export function getBlogCategories(locale: Locale): Promise<BlogCategory[]> {
  return apiGetList<BlogCategory>("/api/v1/customer/blog/categories", locale);
}

/**
 * One article and a few to read next.
 *
 * Uncached: reading an article counts towards its popularity, and a cached
 * response never reaches the server to be counted.
 */
export async function getBlogPost(
  slug: string,
  locale: Locale
): Promise<{ blog: BlogPost; related: BlogPost[] } | null> {
  const content = await apiGet<{ blog?: BlogPost; related?: BlogPost[] } | null>(
    `/api/v1/customer/blog/${encodeURIComponent(slug)}`,
    locale,
    null,
    { cache: "no-store" }
  );
  if (!content?.blog) return null;
  return { blog: content.blog, related: content.related ?? [] };
}

/** A provider, as the customer sees them. */
export interface ProviderProfile {
  id: string;
  company_name?: string;
  company_phone?: string;
  logo_full_path?: string | null;
  cover_image_full_path?: string | null;
  avg_rating?: number;
  total_service_served?: number;
  subscribed_services_count?: number;
  service_availability?: number;
  time_schedule?: { start_time?: string; end_time?: string } | null;
  weekends?: string[];
}

/** A provider on the home page rail, with how far away they are. */
export interface NearbyProvider {
  id: string;
  company_name?: string;
  logo_full_path?: string | null;
  avg_rating?: number;
  rating_count?: number;
  total_service_served?: number;
  subscribed_services_count?: number;
  coordinates?: { latitude?: string | number; longitude?: string | number } | null;
  /** Kilometres from the customer, when their location is known. */
  distance_km?: number;
}

/** Great-circle distance in kilometres. */
function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Providers who serve this customer, nearest first.
 *
 * The backend already returns only providers in the customer's zone who can
 * take another booking, but a zone is a whole city — inside one, everybody
 * looked equally close. Both sides of the distance were already available and
 * simply never compared: the provider's coordinates come with the row, and the
 * customer's are captured when their area is resolved.
 *
 * Sorting happens here rather than in a new endpoint because it needs the
 * customer's position, which is ours and not the API's.
 *
 * Without a known position this falls back to rating. Distance is an
 * improvement on that ordering, never a requirement for it.
 */
export async function getNearbyProviders(
  locale: Locale,
  limit = 12
): Promise<NearbyProvider[]> {
  try {
    const zoneId = await getZoneId();
    const res = await fetch(`${API_BASE}/api/v1/customer/provider/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-localization": locale,
        zoneId,
      },
      body: JSON.stringify({ limit, offset: 1, sort_by: "popular" }),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const content = json?.content;
    const rows = (Array.isArray(content) ? content : content?.data ?? []) as NearbyProvider[];

    const me = await getCustomerCoords();
    if (!me) return rows;

    const withDistance = rows.map((provider) => {
      const lat = Number(provider.coordinates?.latitude);
      const lon = Number(provider.coordinates?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return provider;
      return { ...provider, distance_km: haversineKm(me.lat, me.lon, lat, lon) };
    });

    // A provider with no coordinates on file sorts last rather than first — an
    // unknown distance is not a short one.
    return withDistance.sort(
      (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
    );
  } catch {
    return [];
  }
}

/** A provider the customer may pick for this sub-category. */
export interface BookableProvider {
  id: string;
  company_name?: string;
  logo_full_path?: string | null;
  avg_rating?: number;
  rating_count?: number;
  weekends?: string[];
  time_schedule?: { start_time?: string; end_time?: string } | null;
}

/**
 * Providers who can actually take this booking — in the zone, subscribed to the
 * sub-category, available, not suspended and not already full for the day.
 *
 * Empty is a real answer, not a failure: the picker then stays hidden and the
 * server assigns as it did before.
 */
export async function getBookableProviders(
  subCategoryId: string,
  locale: Locale
): Promise<BookableProvider[]> {
  if (!subCategoryId) return [];
  try {
    const zoneId = await getZoneId();
    const res = await fetch(
      `${API_BASE}/api/v1/customer/provider/list-by-sub-category?sub_category_id=${encodeURIComponent(subCategoryId)}`,
      {
        headers: { Accept: "application/json", "X-localization": locale, zoneId },
        cache: "no-store",
      }
    );
    const json = await res.json();
    const content = json?.content;
    return (Array.isArray(content) ? content : content?.data ?? []) as BookableProvider[];
  } catch {
    return [];
  }
}

export interface ProviderDetails {
  provider: ProviderProfile;
  rating?: { average_rating?: number; rating_count?: number; review_count?: number } | null;
  reviews?: {
    id?: string;
    review_comment?: string;
    review_rating?: number;
    created_at?: string;
    customer?: { first_name?: string; last_name?: string } | null;
  }[];
  sub_categories?: Category[];
}

/**
 * A provider's public profile.
 *
 * The customer is trusting someone to come into their home, and the site never
 * named them — a booking simply arrived with a company attached.
 */
export async function getProviderDetails(
  providerId: string,
  locale: Locale
): Promise<ProviderDetails | null> {
  try {
    const zoneId = await getZoneId();
    const res = await fetch(
      `${API_BASE}/api/v1/customer/provider-details?id=${encodeURIComponent(providerId)}&limit=10&offset=1`,
      {
        headers: { Accept: "application/json", "X-localization": locale, zoneId },
        next: { revalidate: REVALIDATE_SECONDS },
      }
    );
    const json = await res.json();
    const content = json?.content;
    if (!content?.provider) return null;

    // Reviews arrive paginated; the profile only shows the first page.
    return {
      provider: content.provider as ProviderProfile,
      rating: content.rating ?? null,
      reviews: Array.isArray(content.reviews) ? content.reviews : (content.reviews?.data ?? []),
      sub_categories: content.sub_categories ?? [],
    };
  } catch {
    return null;
  }
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
    // limit and offset are required by the endpoint's validator, and without
    // them it answers 400 — which read here as "this sub-category sells no
    // packages" rather than as a malformed request.
    const res = await fetch(
      `${API_BASE}/api/v1/customer/service-package?sub_category_id=${encodeURIComponent(subCategoryId)}&limit=50&offset=1`,
      {
        headers: { Accept: "application/json", "X-localization": locale, zoneId },
        cache: "no-store",
      }
    );
    const json = await res.json();
    const content = json?.content;
    // Paginated or plain, depending on the call — both shapes appear here.
    const rows = Array.isArray(content) ? content : content?.data;
    return Array.isArray(rows) ? (rows as ServicePackage[]) : [];
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
  /** The discount alone — you_save also nets off the fee and its tax. */
  package_discount: number;
  extra_fee: number;
  fee_tax: number;
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
// Re-exported so the many `from "@/lib/api"` call sites keep working. The
// implementation lives in `currency.ts` because this module reads cookies, and
// a client component importing a value from here would drag `next/headers` into
// the browser bundle and fail the build.
export { formatPrice } from "./currency";

/**
 * The "from" price shown on cards/detail = the cheapest real, bookable option.
 * Prefer the minimum variation price (what a customer can actually book) and
 * ignore `min_bidding_price` (a bidding-system floor, not a fixed price); fall
 * back to starting_price/price, and only then min_bidding_price as a last resort.
 */
/**
 * How long the cheapest option takes, in minutes.
 *
 * A service can hold several durations at several prices, and the card shows one
 * of each. Taking the duration from the same variation that set the "from" price
 * keeps the two halves describing the same thing — a price from one option
 * beside a duration from another is a quote for a booking nobody can make.
 */
export function serviceFromDuration(service: {
  variations?: { price?: number | string | null; duration_minutes?: number | null }[];
}): number | null {
  const priced = (service.variations ?? []).filter(
    (v) => Number.isFinite(Number(v?.price)) && Number(v?.price) > 0
  );
  if (priced.length === 0) return null;

  const cheapest = priced.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b));
  const minutes = Number(cheapest.duration_minutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

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

/**
 * Price the customer's actual cart across a list of visit dates.
 *
 * `fetchBookingQuote` prices a line the wizard has not added yet, so it needs a
 * service and variant. Checkout has the opposite problem: the cart is already
 * there and the visit count is what the cart cannot express. Same endpoint,
 * cart mode, and therefore the same calculator the booking is billed from.
 */
export interface CartQuote {
  occurrences: number;
  per_occurrence: number;
  extra_fee: number;
  total_discount_amount: number;
  total_tax_amount: number;
  grand_total: number;
}

export async function fetchCartQuote(
  dates: string[],
  locale: Locale
): Promise<CartQuote | null> {
  if (dates.length === 0) return null;

  const { ok, json } = await authSend(
    "POST",
    "/api/v1/customer/booking/quote",
    { dates: JSON.stringify(dates) },
    locale
  );

  const content = (json as { content?: Record<string, unknown> })?.content;
  if (!ok || !content) return null;

  return {
    occurrences: Number(content.occurrences ?? dates.length),
    per_occurrence: Number(content.per_occurrence ?? 0),
    extra_fee: Number(content.extra_fee ?? 0),
    total_discount_amount: Number(content.total_discount_amount ?? 0),
    total_tax_amount: Number(content.total_tax_amount ?? 0),
    grand_total: Number(content.grand_total ?? 0),
  };
}
