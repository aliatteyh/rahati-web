/** One section's heading and the line under it, as the panel stores them. */
export interface SectionText {
  title?: string;
  intro?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_full_path?: string | null;
  description?: string | null;
  is_active?: number | boolean;
  services_count?: number;
}

/**
 * One section of the home screen: a sub-category customers book, as the panel
 * orders them. The app reads the same list, so the two cannot drift apart.
 */
export interface HomeSection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_full_path?: string | null;
  /** `single`, `subscription`, `unit` or `addons`. */
  booking_flow?: string | null;
  sort_order?: number;
  services_count?: number;
  /** The one service in the section, when it holds only one. */
  service_slug?: string | null;
}

export interface Service {
  /** The word on the featured badge; empty falls back to "Featured". */
  badge_text?: string | null;
  id: string;
  name: string;
  slug?: string;
  category_id?: string;
  is_featured?: number | boolean;
  is_favorite?: number | boolean;
  sub_category_id?: string;
  image_full_path?: string | null;
  cover_image_full_path?: string | null;
  /**
   * The small boxes under the name, as the panel sets them — already worked
   * out and in the reader's language, so the site and the app agree.
   */
  page_facts_resolved?: { key: string; label: string; value: string }[];
  /** A third picture of the work, uploaded on the service in the panel. */
  gallery_image_full_path?: string | null;
  thumbnail_full_path?: string | null;
  short_description?: string | null;
  description?: string | null;
  price?: number | string;
  starting_price?: number | string;
  min_bidding_price?: number | string;
  avg_rating?: number;
  rating_count?: number;
  /** How many times this service has been booked — the popular list counts it. */
  bookings_count?: number;
  category?: {
    name?: string;
    slug?: string;
    category_discount?: DiscountLike[];
    campaign_discount?: DiscountLike[];
  } | null;
  variations?: ServiceVariation[];
  /** How this sub-category is booked: `single`, `subscription`, `unit`, `addons`. */
  booking_flow?: string | null;
  /** Subscription lengths the panel sells, in months. */
  subscription_months?: number[];
  /** How long an add-ons-only visit must be, in minutes. */
  addons_min_minutes?: number;
  faqs?: ServiceFaq[];
  tax?: number | string;
  service_discount?: DiscountLike[];
  campaign_discount?: DiscountLike[];
  /** Serving provider's working hours + weekly off-days (for the booking UI). */
  service_availability?: {
    provider_id?: string | null;
    /** How many providers serve this sub-category in the customer's zone. */
    provider_count?: number;
    time_schedule?: { start_time?: string; end_time?: string } | null;
    /** Weekdays closed to *every* provider — the only ones the picker disables. */
    weekends?: string[];
    max_days_per_week?: number;
  } | null;
}

/** Loose shape of a service/campaign discount entry (for client-side preview only). */
export interface DiscountLike {
  discount_amount?: number | string;
  discount_amount_type?: string;
  discount_type?: string;
  min_purchase?: number | string;
  max_discount_amount?: number | string;
  discount?: DiscountLike;
}

export interface ProfessionalTier {
  professionals: number;
  discount_percent: number;
}

/** Commitment (recurring) discount tier: reached at `min_services` occurrences. */
export interface RepeatTier {
  min_services: number;
  discount_percent: number;
}

export interface ServiceVariation {
  /** What the panel calls it — a unit's name, where the service is sold by unit. */
  variant?: string;
  variant_key?: string;
  price?: number | string;
  duration_minutes?: number;
  /** Cleaners the unit's fixed price already includes. */
  cleaners_count?: number | null;
  /** What materials cost for a visit of this length, flat, per visit. */
  material_charge?: number | null;
}

export interface ServiceFaq {
  id?: string | number;
  question?: string;
  answer?: string;
}

export interface ServiceRating {
  average_rating?: number;
  review_count?: number;
  rating_count?: number;
  rating_group_count?: Array<{ rating?: number; total?: number; count?: number }>;
}

export interface ServiceReview {
  id?: string | number;
  review?: string;
  comment?: string;
  review_rating?: number;
  rating?: number;
  created_at?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    image_full_path?: string | null;
  } | null;
  review_reply?: { reply?: string; reply_by_name?: string } | null;
  reviewReply?: { reply?: string; reply_by_name?: string } | null;
  review_replies?: { reply?: string; reply_by_name?: string }[] | null;
}

/** A subcategory paired with the services it contains (for the category page). */
export interface SubcategoryWithServices {
  subcategory: Category;
  services: Service[];
}

export interface AddOn {
  id: string;
  name: string;
  price?: number | string;
  image_full_path?: string | null;
  /** A line per bullet on the card, in the customer's language. */
  description?: string | null;
  /** Minutes it adds to the visit. */
  duration_minutes?: number;
  /** The add-on's own rating, or the cleaners' until it has one. */
  rating?: number;
  rating_count?: number;
}

/** A day the customer can book, with the start times still free on it. */
export interface AvailableDay {
  date: string;
  slots: string[];
}

/** A social account as the admin panel stores it. */
export interface SocialMediaLink {
  id?: string;
  media?: string;
  link?: string;
  status?: number | string;
}

export interface BusinessConfig {
  business_name?: string;
  /** The "why choose us" row, edited in the admin panel. */
  /** Section headings for the home page, already in the reader's language. */
  home_texts?: {
    services?: SectionText;
    offers?: SectionText;
    pricing?: SectionText;
    how?: SectionText;
    zones?: SectionText;
    reviews?: SectionText;
    careers?: SectionText;
    faq?: SectionText;
    contact?: SectionText;
    cta?: SectionText & { button?: string; href?: string | null };
    steps?: { title: string; text: string }[];
    careers_benefits?: { title: string; text: string }[];
  } | null;
  /** The home page's opening block, already in the reader's language. */
  hero_section?: {
    eyebrow: string;
    headlines: { top: string; bottom?: string }[];
    subtitle: string;
    cta_label: string;
    cta_href: string | null;
    secondary_label: string;
    secondary_href: string | null;
    facts: string[];
    rotate: boolean;
    rotate_seconds: number;
  } | null;
  /** The home page's business block, already in the reader's language. */
  business_section?: {
    title: string;
    intro: string;
    sectors: string[];
    points: { title: string; text: string }[];
    cta_title: string;
    cta_note: string;
    image: string | null;
    phone: string | null;
  } | null;
  /**
   * What a visit involves, as the panel writes it once for the app and the
   * website both (Business settings → App content). Labels arrive already in
   * the reader's language.
   *
   * The schedule carries a `share` of the visit rather than minutes, so one
   * list describes a two-hour clean and an eight-hour one.
   */
  cleaning_schedule_tasks?: { label: string; share?: number | null }[];
  cleaning_materials?: { label: string; image_full_path?: string | null }[];
  customer_provides?: { label: string }[];
  cleaner_credentials?: { label: string }[];
  /**
   * How often a visit of a given length may be booked on a plan. Only the
   * exceptions are sent; a length not listed may be booked at any frequency.
   */
  plan_duration_day_bands?: { minutes: number; min_days: number; max_days: number }[];
  /** The picture beside those lines, uploaded in Business settings → App content. */
  cleaner_credentials_image?: string | null;
  home_highlights?: { icon?: string | null; title?: string | null; description?: string | null }[];
  /** Real reviews shown on the home page; `source` allows Google later. */
  home_testimonials?: { source?: string | null; rating?: number | null; comment?: string | null; author?: string | null; service?: string | null }[];
  social_media?: SocialMediaLink[];
  logo_full_path?: string | null;
  /** Whether the name is printed beside the logo; off unless the office says
   *  their logo is a wordless mark. */
  show_business_name?: boolean;
  /** The number people message. Null where the business has none. */
  whatsapp_number?: string | null;
  business_open_time?: string | null;
  business_close_time?: string | null;
  /** The copyright line, written in Business Settings. */
  footer_text?: string | null;
  /** Policy pages, served by the admin panel. */
  about_us?: string | null;
  privacy_policy?: string | null;
  terms_and_conditions?: string | null;
  cancellation_policy?: string | null;
  refund_policy?: string | null;
  /** The tab icon, uploaded in Business Settings. */
  favicon_full_path?: string | null;
  currency_symbol?: string;
  currency_code?: string;
  business_email?: string;
  business_phone?: string;
  business_address?: string;
  professional_discount_tiers?: ProfessionalTier[];
  material_charge?: number | string;
  additional_charge_fee_amount?: number | string;
  /** Global VAT rate; charged on the service fee only. */
  vat_percentage?: number | string;
  /** Seconds between campaign slides; 0 stops the auto-advance. */
  campaign_slider_interval?: number | string;
  wallet_status?: number | string;
  loyalty_point_status?: number | string;
  review_edit_time_status?: number | string;
  review_edit_time?: number | string;
}

export interface Banner {
  id?: string;
  banner_image_full_path?: string | null;
  /** The card drawn over the picture; absent on an image-only banner. */
  banner_title?: string | null;
  subtitle?: string | null;
  /** A short pill above the title — "New", "This week". */
  button_text?: string | null;
  background_color?: string | null;
  resource_type?: "service" | "category" | "link" | string;
  redirect_link?: string | null;
  service?: { slug?: string } | null;
  category?: { slug?: string } | null;
}

/**
 * The three figures under the headline.
 *
 * Any of them may be null: the server withholds a figure that is too small to
 * mean anything rather than publishing it, so the site shows what it is given
 * and nothing else.
 */
export interface SiteStats {
  customer_rating?: number | null;
  rating_count?: number | null;
  completed_bookings?: number | null;
  served_areas?: number | null;
}
