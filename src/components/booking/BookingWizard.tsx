"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type {
  BookableProvider,
  BookingQuote,
  PackageQuote,
  ServicePackage,
} from "@/lib/api";
import type { DiscountLike, ProfessionalTier, RepeatTier } from "@/lib/types";

type Dict = Record<string, string>;

export interface WizardVariant {
  key: string;
  price: number;
  durationMinutes: number;
}
export interface WizardAddOn {
  id: string;
  name: string;
  price: number;
  image?: string | null;
}
export interface BookingWizardProps {
  locale: Locale;
  dict: Dict;
  currency: string;
  /** Global VAT rate. It applies to the service fee only — service prices are
   *  quoted to the customer inclusive of tax. */
  vatPercent: number;
  serviceFee: number;
  /** Materials rate per hour — a 2-hour variant is charged twice this. */
  materialCharge: number;
  professionalTiers: ProfessionalTier[];
  serviceDiscount: DiscountLike[];
  campaignDiscount: DiscountLike[];
  categoryDiscount: DiscountLike[];
  categoryCampaignDiscount: DiscountLike[];
  serviceId: string;
  categoryId: string;
  subCategoryId: string;
  serviceName: string;
  serviceSlug: string;
  variants: WizardVariant[];
  addOns: WizardAddOn[];
  /** Serving provider's working hours "HH:mm"; slots are limited to this window. */
  workStart?: string | null;
  workEnd?: string | null;
  /** Commitment discount tiers: more recurring services → higher discount. */
  repeatDiscountTiers?: RepeatTier[];
  /** Subscription packages sold for this sub-category. */
  servicePackages?: ServicePackage[];
  /** Weekdays the provider works — the rest are disabled in the picker. */
  selectableWeekdays?: number[];
  providerOffDays?: number[];
  maxDaysPerWeek?: number;
  providerId?: string | null;
  /** Providers who can take this booking; empty leaves the server to assign. */
  bookableProviders?: BookableProvider[];
}

/** Saturday first, matching how the admin panel lists the week. */
const WEEKDAY_ORDER = [6, 7, 1, 2, 3, 4, 5];

/** Off days arrive as lowercase weekday names; the pickers work in ISO numbers. */
const ISO_BY_WEEKDAY: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 7,
};

/**
 * Visits one weekday contributes per month — mirrors
 * ServicePackageQuote::VISITS_PER_WEEKDAY_PER_MONTH. Four, not 4.35: packages
 * are sold as a round number the customer can check against their calendar.
 */
const VISITS_PER_WEEKDAY_PER_MONTH = 4;

/**
 * What the customer is buying, in the order they'd consider it.
 *
 * Replaces the old "once / multiple" plus a separate daily-weekly-custom
 * control: two overlapping questions asking the same thing. These name the
 * commitment instead of the mechanism that generates the dates.
 */
const MODES = ["single", "weekly", "biweekly", "package"] as const;
type BookingMode = (typeof MODES)[number];

const MODE_LABEL: Record<BookingMode, string> = {
  single: "singleVisit",
  weekly: "onceAWeek",
  biweekly: "everyTwoWeeks",
  package: "weeklyMonthlyCleaning",
};

/** Weeks between visits. Only the fortnightly option skips a week. */
const MODE_INTERVAL: Record<BookingMode, number> = {
  single: 1,
  weekly: 1,
  biweekly: 2,
  package: 1,
};

/** Mirrors the backend booking_discount_calculator() (Promotion.php). */
function calcDiscount(keeper: DiscountLike | undefined, base: number): number {
  if (!keeper) return 0;
  const amount = Number(keeper.discount_amount ?? 0);
  if (amount <= 0) return 0;
  const minPurchase = Number(keeper.min_purchase ?? 0);
  if (base < minPurchase) return 0;
  const type = keeper.discount_amount_type ?? keeper.discount_type;
  let value =
    type === "percent" || type === "percentage" ? (base / 100) * amount : amount;
  const max = Number(keeper.max_discount_amount ?? 0);
  if (max > 0 && value > max) value = max;
  return Math.min(value, base);
}

/** Pick the discount keeper: service-level first, else category-level fallback. */
function pickKeeper(
  serviceList: DiscountLike[],
  categoryList: DiscountLike[]
): DiscountLike | undefined {
  const s = serviceList?.[0]?.discount ?? serviceList?.[0];
  if (s?.discount_amount != null) return s;
  return categoryList?.[0]?.discount ?? categoryList?.[0];
}

export function BookingWizard({
  locale,
  dict,
  currency,
  vatPercent,
  serviceFee,
  materialCharge,
  professionalTiers,
  serviceDiscount,
  campaignDiscount,
  categoryDiscount,
  categoryCampaignDiscount,
  serviceId,
  categoryId,
  subCategoryId,
  serviceName,
  serviceSlug,
  variants,
  addOns,
  workStart,
  workEnd,
  repeatDiscountTiers = [],
  servicePackages = [],
  selectableWeekdays = [1, 2, 3, 4, 5, 6, 7],
  providerOffDays = [],
  maxDaysPerWeek = 6,
  providerId = null,
  bookableProviders = [],
}: BookingWizardProps) {
  const safeVariants: WizardVariant[] =
    variants.length > 0 ? variants : [{ key: "default", price: 0, durationMinutes: 60 }];

  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState(1);
  const [variantIndex, setVariantIndex] = useState(0);
  const [professionals, setProfessionals] = useState(1);
  const [materials, setMaterials] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponAmount, setCouponAmount] = useState(0);
  const [couponError, setCouponError] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [dateIndex, setDateIndex] = useState(0);
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<BookingMode>("single");
  // Package mode: which package, and which weekdays the customer commits to.
  const [packageId, setPackageId] = useState<string | null>(null);
  const [packageWeekdays, setPackageWeekdays] = useState<Set<number>>(new Set());
  const [packageQuote, setPackageQuote] = useState<PackageQuote | null>(null);
  const [packageLoading, setPackageLoading] = useState(false);
  // The weekdays (0=Sun..6=Sat) a "multiple times a week" booking runs on,
  // repeated over `weeks` weeks from the chosen start date.
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [weeks, setWeeks] = useState(2);

  /**
   * Keep the customer's choices across a trip to the login page.
   *
   * Placing an order sends anyone not signed in to /login, and every choice —
   * hours, professionals, materials, the package, the weekdays, the time — lived
   * only in memory, so they came back to an empty form that had quietly reset to
   * a single visit. A refresh cost the same. sessionStorage is the right scope:
   * it survives the round trip and dies with the tab.
   */
  const draftKey = `rahati:booking:${serviceSlug}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only resume a draft we deliberately parked on the way to login. Restoring
    // on every visit meant a choice made once — materials, say — came back
    // pre-selected on the next booking, which reads as the form deciding for
    // the customer.
    const resuming = window.sessionStorage.getItem(`${draftKey}:resume`) === "1";
    window.sessionStorage.removeItem(`${draftKey}:resume`);
    if (!resuming) {
      window.sessionStorage.removeItem(draftKey);
      return;
    }

    const raw = window.sessionStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.variantIndex === "number" && d.variantIndex < safeVariants.length) {
        setVariantIndex(d.variantIndex);
      }
      if (typeof d.professionals === "number") setProfessionals(d.professionals);
      if (typeof d.materials === "boolean") setMaterials(d.materials);
      if (typeof d.instructions === "string") setInstructions(d.instructions);
      if (Array.isArray(d.selectedAddOns)) setSelectedAddOns(new Set(d.selectedAddOns as string[]));
      if (typeof d.dateIndex === "number") setDateIndex(d.dateIndex);
      if (typeof d.timeSlot === "string") setTimeSlot(d.timeSlot);
      if (typeof d.bookingMode === "string" && (MODES as readonly string[]).includes(d.bookingMode)) {
        setBookingMode(d.bookingMode as BookingMode);
      }
      if (typeof d.packageId === "string") setPackageId(d.packageId);
      if (Array.isArray(d.packageWeekdays)) setPackageWeekdays(new Set(d.packageWeekdays as number[]));
      if (typeof d.weeks === "number") setWeeks(d.weeks);
      if (typeof d.step === "number") setStep(d.step);
    } catch {
      // A draft we cannot read is worth less than a clean form.
      window.sessionStorage.removeItem(draftKey);
    }
    // Restoring once on mount is the point; re-running would fight the customer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      draftKey,
      JSON.stringify({
        variantIndex,
        professionals,
        materials,
        instructions,
        selectedAddOns: [...selectedAddOns],
        dateIndex,
        timeSlot,
        bookingMode,
        packageId,
        packageWeekdays: [...packageWeekdays],
        weeks,
        step,
      })
    );
  }, [
    draftKey,
    variantIndex,
    professionals,
    materials,
    instructions,
    selectedAddOns,
    dateIndex,
    timeSlot,
    bookingMode,
    packageId,
    packageWeekdays,
    weeks,
    step,
  ]);

  /**
   * An explicit provider choice, or null for "whoever is free".
   *
   * Picking one narrows the day picker to that provider's working week. Leaving
   * it null keeps the previous behaviour: the days offered are those at least
   * one provider works, and the server assigns whoever covers the chosen ones.
   */
  const [chosenProviderId, setChosenProviderId] = useState<string | null>(null);
  const chosenProvider = bookableProviders.find((p) => p.id === chosenProviderId) ?? null;

  /** ISO weekdays the booking must avoid, given the current choice. */
  const activeOffDays = chosenProvider
    ? (chosenProvider.weekends ?? []).map((d) => ISO_BY_WEEKDAY[String(d).toLowerCase()]).filter(Boolean)
    : providerOffDays;

  const variant = safeVariants[variantIndex];

  /** Every mode except a single visit and a package produces its own date list. */
  const isRecurring = bookingMode === "weekly" || bookingMode === "biweekly";

  /**
   * Both package modes, split so a package is offered in exactly one place.
   *
   * "Once a week" carries the one-day plans; "Weekly / Monthly cleaning" carries
   * the rest. Listing every plan under both meant the same package, at the same
   * price, met the customer twice — which reads as two different offers.
   */
  const isPackageMode = bookingMode === "package" || bookingMode === "weekly";
  const weeklyPackages = servicePackages.filter((p) => p.max_days_per_week <= 1);
  const multiDayPackages = servicePackages.filter((p) => p.max_days_per_week > 1);
  const modePackages = bookingMode === "weekly" ? weeklyPackages : multiDayPackages;

  const money = (n: number) =>
    `${currency} ${n.toLocaleString(locale === "ar" ? "ar" : "en")}`;

  function fmtDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} ${dict.min}`;
    if (minutes % 60 === 0) return `${minutes / 60} ${dict.hours}`;
    return `${Math.floor(minutes / 60)} ${dict.hours} ${minutes % 60} ${dict.min}`;
  }

  const days = useMemo(() => {
    const list: { date: Date; weekday: string; day: string }[] = [];
    const wd = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const dn = new Intl.DateTimeFormat(locale, { day: "numeric" });
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push({ date: d, weekday: wd.format(d), day: dn.format(d) });
    }
    return list;
  }, [locale]);

  // Localized short weekday names indexed 0=Sun..6=Sat, for the Weekly picker.
  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 2024-06-02 is a Sunday; add 0..6 to walk Sun..Sat.
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 5, 2 + i))
    );
  }, [locale]);

  // 30-minute slots limited to the serving provider's working hours; falls back
  // to 08:00–20:00 when the provider hasn't set a schedule.
  const timeSlots = useMemo(() => {
    const toMinutes = (t?: string | null): number | null => {
      const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "");
      if (!m) return null;
      return Number(m[1]) * 60 + Number(m[2]);
    };
    const startMin = toMinutes(workStart) ?? 8 * 60;
    let endMin = toMinutes(workEnd) ?? 20 * 60;
    if (endMin <= startMin) endMin = 20 * 60; // guard against bad data
    const fmt = (mins: number) =>
      `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    const slots: string[] = [];
    // Only whole 30-min slots that finish on/before the provider's end time.
    for (let s = startMin; s + 30 <= endMin; s += 30) {
      slots.push(`${fmt(s)}-${fmt(s + 30)}`);
    }
    return slots;
  }, [workStart, workEnd]);

  const addOnsTotal = useMemo(
    () =>
      addOns
        .filter((a) => selectedAddOns.has(a.id))
        .reduce((sum, a) => sum + a.price, 0),
    [addOns, selectedAddOns]
  );

  // Build a "YYYY-MM-DD HH:mm:00" schedule string for a given date + time slot.
  function scheduleFor(d: Date): string {
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const start = (timeSlot ?? "09:00").split("-")[0];
    return `${ymd} ${start}:00`;
  }

  function buildSchedule(): string {
    return scheduleFor(days[dateIndex].date);
  }

  // Build the array of dates for a "multiple times" booking. The backend drops
  // any date that falls on the provider's off day, so we send the full request.
  function buildDates(): { date: string }[] {
    // Weekly and fortnightly take their weekday from the date the customer
    // picked — they are not asked the same thing twice — and repeat it for the
    // chosen number of weeks, skipping alternate weeks when fortnightly.
    if (bookingMode === "weekly" || bookingMode === "biweekly") {
      const start = days[dateIndex].date;
      const step = MODE_INTERVAL[bookingMode] * 7;
      const out: { date: string }[] = [];
      for (let offset = 0; offset < weeks * 7; offset += step) {
        const d = new Date(start);
        d.setDate(d.getDate() + offset);
        out.push({ date: scheduleFor(d) });
      }
      return out;
    }

    // Single visit and package modes do not generate a list here.
    return [{ date: buildSchedule() }];
  }

  async function proceedToCheckout() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          category_id: categoryId,
          sub_category_id: subCategoryId,
          variant_key: variant.key,
          quantity: 1,
          professional_count: professionals,
          need_materials: materials ? 1 : 0,
          add_ons: [...selectedAddOns].map((id) => ({ id, quantity: 1 })),
          // Carried on the cart line so checkout creates a package purchase and
          // applies the package discount instead of the commitment tier.
          // Only when the customer actually chose; otherwise the server picks.
          provider_id: chosenProviderId,
          service_package_id: isPackageMode ? packageId : null,
          package_days_per_week:
            isPackageMode ? packageQuote?.days_per_week ?? null : null,
          package_payment_mode: isPackageMode ? "pay_per_visit" : null,
          locale,
        }),
      });
      const data = await res.json();
      if (data.needsLogin) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(`${draftKey}:resume`, "1");
        }
        router.push(`/${locale}/login`);
        return;
      }
      if (data.ok) {
        // The cart now holds the order, so the draft has done its job.
        if (typeof window !== "undefined") window.sessionStorage.removeItem(draftKey);
        const instr = encodeURIComponent(instructions);
        if (isPackageMode && packageId) {
          // The server already generated the exact visit list; send that rather
          // than re-deriving it, so the schedule bought is the schedule booked.
          const dates = encodeURIComponent(
            JSON.stringify((packageQuote?.dates ?? []).map((d) => ({ date: d })))
          );
          router.push(
            `/${locale}/checkout?service_type=repeat&dates=${dates}&instructions=${instr}`
          );
          return;
        }
        if (isRecurring) {
          const dates = encodeURIComponent(JSON.stringify(buildDates()));
          router.push(
            `/${locale}/checkout?service_type=repeat&dates=${dates}&instructions=${instr}`
          );
        } else {
          const schedule = encodeURIComponent(buildSchedule());
          router.push(`/${locale}/checkout?schedule=${schedule}&instructions=${instr}`);
        }
      } else {
        setSubmitError(data.message || dict.cartFailed);
      }
    } catch {
      setSubmitError(dict.cartFailed);
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Invoice preview (mirrors the backend CartModule formula) ----
  const tierPercent = (() => {
    const t = professionalTiers.find((x) => Number(x.professionals) === professionals);
    return t ? Number(t.discount_percent) || 0 : 0;
  })();
  // For a recurring booking every selected date repeats the per-occurrence
  // charges; a single (or empty) selection counts as one.
  const occurrenceCount =
    isRecurring ? Math.max(1, buildDates().length) : 1;

  // Service amount includes professionals: base price × count, with the tier
  // discount applied. Both halves are kept so the summary can show the saving
  // rather than only its result — a total that quietly shrinks reads as a bug.
  const serviceGross = variant.price * professionals;
  const localProfessionalDiscount = Math.round(serviceGross * (tierPercent / 100) * 100) / 100;
  const serviceAmount = serviceGross - localProfessionalDiscount;
  // Materials are charged per hour of booked time, mirroring MaterialCharge.php.
  // Professionals deliberately do not multiply it: one set of materials serves
  // the visit however many people arrive.
  // Kept whether or not materials are selected, so the two options can be
  // priced side by side — the customer compares totals, not a rate.
  const materialCost = Math.round(materialCharge * (variant.durationMinutes / 60) * 100) / 100;
  const materialsFee = materials ? materialCost : 0;
  const itemsSubtotal = serviceAmount + materialsFee + addOnsTotal;

  // Service / campaign discount on the service amount; backend applies the GREATER of the two
  const svcDiscount = calcDiscount(pickKeeper(serviceDiscount, categoryDiscount), serviceAmount);
  const campDiscount = calcDiscount(
    pickKeeper(campaignDiscount, categoryCampaignDiscount),
    serviceAmount
  );
  const campApplicable = campDiscount >= svcDiscount && campDiscount > 0;
  const applicableDiscount = Math.max(svcDiscount, campDiscount);
  const couponDiscount = couponApplied ? couponAmount : 0;
  const totalDiscounts = applicableDiscount + couponDiscount;

  const taxableBase = Math.max(0, itemsSubtotal - totalDiscounts);
  // VAT is charged on the service fee only, once per booking — never per visit.
  const vat = (serviceFee * vatPercent) / 100;
  // Commitment discount: the more recurring services, the higher the admin-set
  // tier percent, applied to the (pre-tax) recurring base. Mirrors the backend.
  const commitmentPercent =
    isRecurring
      ? repeatDiscountTiers.reduce(
          (acc, t) =>
            occurrenceCount >= Number(t.min_services)
              ? Math.max(acc, Number(t.discount_percent) || 0)
              : acc,
          0
        )
      : 0;
  const localCommitmentDiscount = (taxableBase * occurrenceCount * commitmentPercent) / 100;
  // Shown instantly while the server quote is in flight; the server's number
  // replaces it as soon as it arrives, and is what the customer is charged.
  const localTotal = Math.max(
    0,
    taxableBase * occurrenceCount + serviceFee + vat - localCommitmentDiscount
  );

  // The authoritative price comes from the backend calculator — the same one
  // placeRepeatBookingRequest uses — so the total quoted and the total charged
  // cannot drift apart as discount rules change.
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  // A one-off booking is a single occurrence: quoting buildDates() here would
  // price the whole candidate range the recurring UI keeps in state.
  const quoteDates =
    isRecurring ? buildDates().map((x) => x.date) : [buildSchedule()];
  const quoteKey = JSON.stringify({
    v: variant.key,
    p: professionals,
    m: materials,
    a: [...selectedAddOns].sort(),
    d: quoteDates,
  });

  useEffect(() => {
    let cancelled = false;
    setQuote(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/booking/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            serviceId,
            variantKey: variant.key,
            quantity: 1,
            professionalCount: professionals,
            needMaterials: materials,
            addOns: [...selectedAddOns].map((id) => ({ id, quantity: 1 })),
            dates: quoteDates,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as BookingQuote;
        if (!cancelled) setQuote(data);
      } catch {
        // Keep the local estimate on the screen rather than blanking the price.
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, locale, serviceId]);

  const selectedPackage = servicePackages.find((p) => p.id === packageId) ?? null;

  // A package sells a band of weekdays; outside it the server refuses, so the
  // picker must not let the customer build a selection that cannot be bought.
  // Built from the tiers that actually exist, intersected with the package's
  // own limits. A package can be saved with a wide day range but only one
  // priced tier, and offering the unpriced days just walks the customer into a
  // refusal they could not have predicted.
  const packageSellableDays = (selectedPackage?.tiers ?? [])
    .map((t) => t.days_per_week)
    .filter(
      (d) =>
        d >= (selectedPackage?.min_days_per_week ?? 1) &&
        d <= Math.min(maxDaysPerWeek, selectedPackage?.max_days_per_week ?? maxDaysPerWeek)
    )
    .sort((a, b) => a - b);

  const packageMinDays = packageSellableDays[0] ?? 1;
  const packageMaxDays = packageSellableDays[packageSellableDays.length - 1] ?? maxDaysPerWeek;

  /**
   * Days to start a package off with, spread across the week.
   *
   * Every package sells a fixed number of days, so switching to one while the
   * previous package's days were still selected left the count wrong and the
   * server refused the quote — the customer saw an empty panel and no reason
   * for it. Seeding a valid selection means the price is there the moment a
   * package is picked, which is also what makes the six packages comparable:
   * otherwise each one costs three taps just to reveal its number.
   *
   * Spread rather than consecutive — someone buying three cleans a week wants
   * them spaced, not Sunday to Tuesday — and never a day the provider is off.
   * Suggested, not imposed: every chip stays free to change.
   */
  const suggestedPackageDays = (count: number): Set<number> => {
    const available = WEEKDAY_ORDER.filter((iso) => !activeOffDays.includes(iso));
    const wanted = Math.min(count, available.length);
    if (wanted <= 0) return new Set();

    const picked = new Set<number>();
    const step = available.length / wanted;
    for (let i = 0; i < wanted; i++) {
      // Walk forward from the ideal slot so a collision takes the next free day
      // rather than silently returning fewer days than the package requires.
      for (let j = 0; j < available.length; j++) {
        const day = available[(Math.round(i * step) + j) % available.length];
        if (!picked.has(day)) {
          picked.add(day);
          break;
        }
      }
    }
    return picked;
  };

  // Headline for the tab: the best saving any package on offer can reach.
  const bestPackageSaving = servicePackages.reduce(
    (best, p) => Math.max(best, p.max_discount_percent ?? 0),
    0
  );

  // ISO weekday (1=Mon..7=Sun) to a localised short name.
  function isoWeekdayName(iso: number): string {
    // 2026-08-03 is a Monday, so adding (iso-1) days lands on the wanted weekday.
    const d = new Date(2026, 7, 2 + iso);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
  }

  // Package pricing comes from its own endpoint, which also decides how many
  // visits the chosen weekdays actually produce once the provider's off day is
  // removed. Never recomputed here — the visit count is what the customer pays
  // for, and a second implementation is how the two drift apart.
  useEffect(() => {
    if (!isPackageMode || !packageId || packageWeekdays.size === 0) {
      setPackageQuote(null);
      return;
    }

    let cancelled = false;
    setPackageLoading(true);
    const timer = setTimeout(async () => {
      try {
        const start = days[dateIndex]?.date ?? new Date();
        const res = await fetch("/api/service-package/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            packageId,
            serviceId,
            variantKey: variant.key,
            providerId,
            startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
            time: (timeSlot ?? "09:00").split("-")[0],
            weekdays: [...packageWeekdays].sort((a, b) => a - b),
            professionalCount: professionals,
            needMaterials: materials,
            addOns: [...selectedAddOns].map((id) => ({ id, quantity: 1 })),
          }),
        });
        if (!res.ok) {
          if (!cancelled) setPackageQuote(null);
          return;
        }
        const data = (await res.json()) as PackageQuote;
        if (!cancelled) setPackageQuote(data);
      } catch {
        if (!cancelled) setPackageQuote(null);
      } finally {
        if (!cancelled) setPackageLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bookingMode,
    packageId,
    [...packageWeekdays].sort().join(","),
    dateIndex,
    timeSlot,
    variant.key,
    professionals,
    materials,
    [...selectedAddOns].sort().join(","),
  ]);

  // The coupon is applied client-side on top, since /quote prices the cart line
  // and the coupon is validated separately.
  const commitmentDiscount = quote ? quote.commitment_discount : localCommitmentDiscount;
  // Shown, not calculated: the server already priced this line, and preferring
  // its figure means a stale config can never make the lines contradict the
  // total printed beneath them.
  // Per occurrence on both sides: the server sums the cart lines of one visit,
  // and the summary multiplies by the visit count itself just below.
  const professionalDiscount = quote ? quote.professional_discount : localProfessionalDiscount;
  const professionalPercent = serviceGross > 0
    ? Math.round((professionalDiscount / serviceGross) * 100)
    : 0;
  const grandTotal =
    isPackageMode && packageId
      ? packageQuote?.grand_total ?? 0
      : quote
        ? Math.max(0, quote.grand_total - couponDiscount * occurrenceCount)
        : localTotal;

  // The two cards price the service and the materials, and nothing else — no
  // service fee, no tax. Those are the same whichever card is picked, so
  // folding them in would inflate both numbers and bury the one difference the
  // customer is being asked to weigh.
  const priceWithoutMaterials = serviceAmount * occurrenceCount;
  const priceWithMaterials = (serviceAmount + materialCost) * occurrenceCount;

  async function applyCoupon() {
    const code = coupon.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(false);
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode: code, serviceId, amount: serviceAmount, locale }),
      });
      const data = await res.json();
      if (data?.valid) {
        setCouponApplied(true);
        setCouponAmount(Number(data.discount_amount) || 0);
        setCouponError(false);
        setCouponMessage("");
      } else {
        setCouponApplied(false);
        setCouponAmount(0);
        setCouponError(true);
        setCouponMessage(data?.message || dict.couponInvalid);
      }
    } catch {
      setCouponApplied(false);
      setCouponAmount(0);
      setCouponError(true);
      setCouponMessage(dict.couponInvalid);
    } finally {
      setCouponLoading(false);
    }
  }

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedDate = days[dateIndex]?.date;
  const dateLabel = selectedDate
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(selectedDate)
    : "";

  // A recurring selection must actually resolve to at least one date.
  // "Multiple times a week" is the one mode that needs a further answer before
  // it resolves to any dates at all.
  // Weekly and fortnightly both take their day from the date picked below, so
  // there is nothing left that could be half-answered.
  const recurringValid = true;
  const canProceed = step < 3 || (timeSlot !== null && recurringValid);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Step header */}
      <div className="mb-6 flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-ink hover:border-primary"
            aria-label={dict.back}
          >
            <svg className="rtl-flip h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div>
          <p className="text-sm text-muted">
            {dict.step} {step} {dict.of} 4
          </p>
          <h1 className="text-2xl font-bold text-ink">
            {step === 1 && serviceName}
            {step === 2 && dict.addonsTitle}
            {step === 3 && dict.dateTimeTitle}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ---- Left: step content ---- */}
        {/* min-w-0 lets the grid track shrink so the horizontal day scroller
            scrolls internally instead of forcing the whole page wide. */}
        <div className="min-w-0 rounded-2xl border border-border bg-surface p-6">
          {step === 1 && (
            <div className="space-y-8">
              {/* Coupon */}
              <div className="rounded-xl border border-border bg-surface-soft p-4">
                <p className="mb-2 text-sm font-semibold text-ink">{dict.coupon}</p>
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder={dict.couponPlaceholder}
                    className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
                  >
                    {couponLoading ? "…" : dict.apply}
                  </button>
                </div>
                {couponApplied && (
                  <p className="mt-2 text-sm text-primary">
                    {dict.couponApplied} · -{money(couponAmount)}
                  </p>
                )}
                {couponError && (
                  <p className="mt-2 text-sm text-accent-dark">
                    {couponMessage || dict.couponInvalid}
                  </p>
                )}
              </div>

              {/* Duration / variant */}
              <div>
                <p className="mb-3 font-semibold text-ink">{dict.hoursQuestion}</p>
                <div className="flex flex-wrap gap-3">
                  {safeVariants.map((v, i) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setVariantIndex(i)}
                      className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                        i === variantIndex
                          ? "border-primary bg-primary-light text-primary-dark"
                          : "border-border text-muted hover:border-primary"
                      }`}
                    >
                      {fmtDuration(v.durationMinutes)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Professionals */}
              <div>
                <p className="mb-3 font-semibold text-ink">{dict.professionalsQuestion}</p>
                <div className="flex gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setProfessionals(n)}
                      className={`grid h-11 w-11 place-items-center rounded-full border text-sm font-medium transition ${
                        n === professionals
                          ? "border-primary bg-primary text-white"
                          : "border-border text-muted hover:border-primary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider — only where there is an actual choice to make. */}
              {bookableProviders.length > 1 && (
                <div>
                  <p className="mb-3 font-semibold text-ink">{dict.chooseProvider}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[null, ...bookableProviders].map((p) => {
                      const selected = (p?.id ?? null) === chosenProviderId;
                      const offNames = (p?.weekends ?? [])
                        .map((d) => isoWeekdayName(ISO_BY_WEEKDAY[String(d).toLowerCase()]))
                        .filter(Boolean);
                      return (
                        <button
                          key={p?.id ?? "any"}
                          type="button"
                          onClick={() => setChosenProviderId(p?.id ?? null)}
                          className={`rounded-xl border p-3 text-start transition ${
                            selected
                              ? "border-primary bg-primary-light"
                              : "border-border bg-surface hover:border-primary"
                          }`}
                        >
                          <span className="block text-sm font-semibold text-ink">
                            {p ? p.company_name : dict.anyProvider}
                          </span>
                          {p ? (
                            <span className="mt-0.5 block text-xs text-muted">
                              {Number(p.avg_rating ?? 0) > 0 && `★ ${Number(p.avg_rating).toFixed(1)} · `}
                              {/* Their day off, said up front — it is what limits
                                  the days offered once they are chosen. */}
                              {offNames.length > 0
                                ? `${dict.offOn} ${offNames.join(", ")}`
                                : dict.everyDay}
                            </span>
                          ) : (
                            <span className="mt-0.5 block text-xs text-muted">
                              {dict.anyProviderHint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Materials */}
              <div>
                <p className="mb-3 font-semibold text-ink">{dict.materialsQuestion}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([false, true] as const).map((wants) => {
                    const selected = wants === materials;
                    const price = wants ? priceWithMaterials : priceWithoutMaterials;
                    return (
                      <button
                        key={String(wants)}
                        type="button"
                        onClick={() => setMaterials(wants)}
                        className={`rounded-xl border p-4 text-start transition ${
                          selected
                            ? "border-primary bg-primary-light"
                            : "border-border bg-surface hover:border-primary"
                        }`}
                      >
                        <span
                          className={`block text-sm font-medium ${
                            selected ? "text-primary-dark" : "text-ink"
                          }`}
                        >
                          {wants ? dict.materialsYes : dict.materialsNo}
                        </span>
                        <span className="mt-1 block text-lg font-bold text-ink">
                          {money(price)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Say the rate out loud: a per-hour charge is a surprise on the
                    invoice unless the customer sees how it was reached. */}
                {materials && materialsFee > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    {dict.materialsRateNote
                      .replace("{rate}", money(materialCharge))
                      .replace("{hours}", String(variant.durationMinutes / 60))
                      .replace("{total}", money(materialsFee))}
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div>
                <p className="mb-3 font-semibold text-ink">{dict.instructions}</p>
                <textarea
                  value={instructions}
                  maxLength={150}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={dict.instructionsPlaceholder}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-primary"
                />
                <p className="mt-1 text-end text-xs text-muted">{instructions.length}/150</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-5 font-semibold text-ink">{dict.addonsSub}</p>
              {addOns.length === 0 ? (
                <p className="text-muted">—</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {addOns.map((a) => {
                    const active = selectedAddOns.has(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAddOn(a.id)}
                        className={`flex flex-col rounded-2xl border p-3 text-start transition ${
                          active ? "border-primary bg-primary-light" : "border-border hover:border-primary"
                        }`}
                      >
                        {/* The API sends image_full_path as null when nothing was
                            uploaded, so the card degrades to text rather than
                            showing a broken frame. */}
                        {a.image && (
                          <img
                            src={a.image}
                            alt=""
                            className="mb-2 aspect-square w-full rounded-xl object-cover"
                          />
                        )}
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{a.name}</span>
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-lg ${
                              active ? "bg-primary text-white" : "bg-primary/10 text-primary"
                            }`}
                          >
                            {active ? "✓" : "+"}
                          </span>
                        </span>
                        {a.price > 0 && (
                          <span className="mt-2 text-sm font-bold text-primary">
                            {money(a.price)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              {/* Take the service: once / multiple times */}
              <div>
                <p className="mb-3 font-semibold text-ink">{dict.takeService}</p>
                {/* Named for what the customer is buying, not for the mechanism
                    that produces the dates. The package option only appears where
                    a package is actually sold. */}
                <div className="space-y-2">
                  {MODES.filter((m) => m !== "package" || multiDayPackages.length > 0).map((m) => {
                    const selected = bookingMode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setBookingMode(m)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start transition ${
                          selected
                            ? "border-primary bg-primary-light"
                            : "border-border bg-surface hover:border-primary"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className={`block text-sm font-semibold ${selected ? "text-primary-dark" : "text-ink"}`}>
                            {dict[MODE_LABEL[m]]}
                          </span>
                          {m === "single" && (
                            <span className="block text-xs text-muted">{dict.singleVisitHint}</span>
                          )}
                          {/* Steering, not restricting: the middle option is the one
                              most customers want, and saying so saves them deciding. */}
                          {m === "weekly" && (
                            <span className="mt-1 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-dark">
                              {dict.mostPopular}
                            </span>
                          )}
                        </span>
                        {m === "package" && bestPackageSaving > 0 && (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-xs font-bold text-white">
                            {dict.saveUpTo} {bestPackageSaving}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {isPackageMode && modePackages.length > 0 && (
                  <div className="mt-4 space-y-4 rounded-xl border border-border bg-surface-soft p-4">
                    {/* Choose the plan */}
                    <div className="space-y-2">
                      {modePackages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className={`rounded-xl border transition ${
                            packageId === pkg.id
                              ? "border-primary bg-primary-light"
                              : "border-border bg-white hover:border-primary"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setPackageId(pkg.id);
                              // Carrying the previous package's days over left
                              // the count wrong for the new one, and the quote
                              // came back refused with nothing on screen.
                              const days = (pkg.tiers ?? [])
                                .map((t) => t.days_per_week)
                                .filter(
                                  (d) =>
                                    d >= pkg.min_days_per_week &&
                                    d <= Math.min(maxDaysPerWeek, pkg.max_days_per_week)
                                )
                                .sort((a, b) => a - b);
                              setPackageWeekdays(suggestedPackageDays(days[0] ?? pkg.min_days_per_week));
                            }}
                            className="flex w-full items-start justify-between gap-3 p-3 text-start"
                          >
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink">{pkg.name}</span>
                              {pkg.short_description && (
                                <span className="block text-xs text-muted">{pkg.short_description}</span>
                              )}
                            </span>
                            {pkg.tiers?.length > 0 && (
                              /* The ladder in the customer's own units: they buy a
                                 number of services a month, and pick the weekdays
                                 that deliver it further down. */
                              <span className="mt-1 block text-xs text-muted">
                                {pkg.tiers
                                  .filter(
                                    (t) =>
                                      t.days_per_week >= pkg.min_days_per_week &&
                                      t.days_per_week <= pkg.max_days_per_week
                                  )
                                  .map((t) => t.visits_per_month ?? t.days_per_week * VISITS_PER_WEEKDAY_PER_MONTH)
                                  .join(" · ")}{" "}
                                {dict.servicesPerMonth}
                              </span>
                            )}
                            {pkg.max_discount_percent > 0 && (
                              /* "Up to", because the headline rate is only reached at
                                 the top of the ladder — a flat "-25%" is a promise the
                                 two-day option breaks, and the customer notices. */
                              <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-xs font-bold text-white">
                                {dict.saveUpTo} {pkg.max_discount_percent}%
                              </span>
                            )}
                          </button>

                        {packageId === pkg.id && (
                          <div className="space-y-3 border-t border-border/70 px-3 pb-3 pt-3">
                            <div>
                              {/* The cap is the package's own, not the system's: a
                                  two-day package must not let six be picked, which
                                  the server now refuses anyway. */}
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-ink">
                                  {dict.chooseDays}
                                  {/* Said plainly, because the days were picked
                                      for the customer rather than by them. */}
                                  <span className="ms-2 font-normal text-muted">{dict.daysSuggested}</span>
                                </p>
                                {packageWeekdays.size >= packageMaxDays && (
                                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-dark">
                                    ⚠ {dict.maxDaysReached}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {WEEKDAY_ORDER.map((iso) => {
                                  const off = activeOffDays.includes(iso);
                                  const on = packageWeekdays.has(iso);
                                  // Full: selected days stay removable, the rest go
                                  // quiet rather than silently ignoring the tap.
                                  const full = !on && packageWeekdays.size >= packageMaxDays;
                                  return (
                                    <button
                                      key={iso}
                                      type="button"
                                      disabled={off || full}
                                      title={off ? dict.providerOffDay : full ? dict.maxDaysReached : undefined}
                                      onClick={() => {
                                        const next = new Set(packageWeekdays);
                                        if (next.has(iso)) next.delete(iso);
                                        else if (next.size < packageMaxDays) next.add(iso);
                                        setPackageWeekdays(next);
                                      }}
                                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                        off
                                          ? "cursor-not-allowed border-border bg-surface-soft text-muted/50 line-through"
                                          : on
                                            ? "border-primary bg-primary text-white"
                                            : full
                                              ? "cursor-not-allowed border-border bg-surface text-muted/40"
                                              : "border-border text-muted hover:border-primary"
                                      }`}
                                    >
                                      {isoWeekdayName(iso)}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="mt-2 text-xs text-muted">
                                {(packageMinDays === packageMaxDays
                                  ? dict.packageExactly
                                  : dict.packageRange
                                )
                                  .replace("{min}", String(packageMinDays * VISITS_PER_WEEKDAY_PER_MONTH))
                                  .replace("{max}", String(packageMaxDays * VISITS_PER_WEEKDAY_PER_MONTH))}
                                {selectableWeekdays.length < 7 ? ` · ${dict.offDayExcluded}` : ""}
                              </p>
                              {/* Below the minimum the booking cannot go through, so
                                  say it here rather than at the checkout button. */}
                              {packageWeekdays.size > 0 && packageWeekdays.size < packageMinDays && (
                                <p className="mt-1 text-xs font-semibold text-danger">
                                  {dict.packageBelowMin.replace(
                                    "{min}",
                                    String(packageMinDays * VISITS_PER_WEEKDAY_PER_MONTH)
                                  )}
                                </p>
                              )}

                              {/* Names the saving and the reason that earned it, so a
                                  moving total reads as a reward rather than a number
                                  changing on its own. */}
                              {packageQuote?.valid && packageQuote.discount_percent > 0 && (
                                <p className="mt-2 rounded-lg bg-primary-light/60 px-3 py-2 text-sm font-medium text-primary-dark">
                                  🏷️ {dict.youSavedByChoosing
                                    .replace("{percent}", String(packageQuote.discount_percent))
                                    .replace("{days}", String(packageQuote.days_per_week))}
                                </p>
                              )}
                            </div>

                            {packageLoading && (
                              <p className="text-sm text-muted">{dict.calculating}</p>
                            )}

                            {!packageLoading && packageQuote?.valid && (
                              <div className="rounded-xl border border-primary/30 bg-white p-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted">{dict.visits}</span>
                                  <span className="font-semibold text-ink">{packageQuote.total_visits}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted">{dict.perVisit}</span>
                                  <span className="text-ink">
                                    <s className="text-muted">{money(packageQuote.undiscounted_visit_price)}</s>{" "}
                                    <span className="font-semibold">{money(packageQuote.net_visit_price)}</span>
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted">{dict.period}</span>
                                  <span className="text-ink">
                                    {packageQuote.first_visit.slice(0, 10)} → {packageQuote.last_visit.slice(0, 10)}
                                  </span>
                                </div>
                                {packageQuote.you_save > 0 && (
                                  <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold text-primary-dark">
                                    <span>{dict.youSave}</span>
                                    <span>{money(packageQuote.you_save)}</span>
                                  </div>
                                )}
                                {packageQuote.skipped_off_days > 0 && (
                                  <p className="mt-2 text-xs text-muted">{dict.offDayExcluded}</p>
                                )}
                              </div>
                            )}

                            {!packageLoading && packageQuote && !packageQuote.valid && (
                              <p className="text-sm text-danger">
                                {/* below_min is already said inline the moment
                                    the selection drops below the minimum,
                                    without waiting for the server — repeating
                                    it here printed the same sentence twice. */}
                                {packageQuote.reason === "below_min"
                                  ? ""
                                  : packageQuote.reason === "above_max"
                                    ? dict.packageAboveMax.replace(
                                        "{max}",
                                        String(packageMaxDays * VISITS_PER_WEEKDAY_PER_MONTH)
                                      )
                                    : packageQuote.reason === "no_tier"
                                      ? dict.packageNoTier
                                      : dict.noDatesForPackage}
                              </p>
                            )}
                          </div>
                        )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: with no one-day package on sale, "once a week" is
                    still bookable free-form rather than showing an empty tab. */}
                {isRecurring && !(bookingMode === "weekly" && weeklyPackages.length > 0) && (
                  <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-soft p-4">
                    {/* Weekly and fortnightly take their day from the date picked
                        below, so there is nothing further to ask here. */}
                    <p className="text-sm text-muted">
                      {bookingMode === "biweekly" ? dict.everyTwoWeeksHint : dict.onceAWeekHint}
                    </p>


                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted">{dict.weeks}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWeeks((n) => Math.max(1, n - 1))}
                          className="grid h-8 w-8 place-items-center rounded-full border border-border text-lg text-ink"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-semibold text-ink">{weeks}</span>
                        <button
                          type="button"
                          onClick={() => setWeeks((n) => Math.min(12, n + 1))}
                          className="grid h-8 w-8 place-items-center rounded-full border border-border text-lg text-ink"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-muted">{dict.offDaysNote}</p>
                  </div>
                )}
              </div>

              {/* Date */}
              {(() => {
                // Every mode now asks for exactly one date. For the recurring
                // ones it is the first visit, and its weekday becomes the
                // recurring day — so the customer is never asked twice.
                const heading = isRecurring ? dict.startDay : dict.whenQuestion;
                return (
                  <div>
                    <p className="mb-3 font-semibold text-ink">{heading}</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {days.map((d, i) => {
                        // A start date on the provider's off day would produce a
                        // schedule whose every visit is skipped server-side.
                        const iso = d.date.getDay() === 0 ? 7 : d.date.getDay();
                        const off = isRecurring && activeOffDays.includes(iso);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={off}
                            title={off ? dict.providerOffDay : undefined}
                            onClick={() => setDateIndex(i)}
                            className={`flex shrink-0 flex-col items-center rounded-2xl border px-3 py-2 transition ${
                              off
                                ? "cursor-not-allowed border-border text-muted/40 line-through"
                                : i === dateIndex
                                  ? "border-primary bg-primary text-white"
                                  : "border-border text-muted hover:border-primary"
                            }`}
                          >
                            <span className="text-xs">{d.weekday}</span>
                            <span className="text-lg font-bold">{d.day}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Time */}
              <div>
                <p className="mb-3 font-semibold text-ink">{dict.timeQuestion}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTimeSlot(slot)}
                      dir="ltr"
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        slot === timeSlot
                          ? "border-primary bg-primary text-white"
                          : "border-border text-muted hover:border-primary"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-surface-soft p-4 text-sm text-muted">
                {dict.freeCancellation}
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="mt-8">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent-dark"
              >
                {dict.next}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!canProceed || submitting}
                  onClick={proceedToCheckout}
                  className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? dict.processing : dict.continue}
                </button>
                {submitError && (
                  <p className="mt-2 text-center text-sm text-accent-dark">{submitError}</p>
                )}
                <p className="mt-2 text-center text-sm text-muted">
                  {timeSlot ? dict.step4Note : dict.selectTimePrompt}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ---- Right: summary sidebar ---- */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-lg font-bold text-ink">{dict.bookingDetails}</h2>
            <dl className="space-y-3 text-sm">
              <Row label={dict.service} value={serviceName} />
              <Row
                label={dict.frequency}
                value={
                  bookingMode === "single"
                    ? dict.singleVisit
                    : isPackageMode && packageId
                      ? // Name the plan the customer chose, not the generic mode:
                        // "3 Month Package · 6 days/week" says what was bought.
                        selectedPackage
                        ? `${selectedPackage.name}${
                            packageQuote?.valid
                              ? ` · ${packageQuote.days_per_week} ${dict.daysPerWeek}`
                              : ""
                          }`
                        : dict.packages
                      : `${dict[MODE_LABEL[bookingMode]]} (${recurringValid ? buildDates().length : 0})`
                }
              />
              {isPackageMode && packageQuote?.valid && (
                <>
                  <Row label={dict.visits} value={String(packageQuote.total_visits)} />
                  <Row
                    label={dict.period}
                    value={`${packageQuote.first_visit.slice(0, 10)} → ${packageQuote.last_visit.slice(0, 10)}`}
                  />
                </>
              )}
              <Row label={dict.duration} value={fmtDuration(variant.durationMinutes)} />
              <Row label={dict.professionals} value={String(professionals)} />
              <Row label={dict.material} value={materials ? dict.yes : dict.no} />
              {timeSlot && (
                <Row label={dict.date} value={`${dateLabel}, ${timeSlot}`} />
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-lg font-bold text-ink">{dict.paymentSummary}</h2>
            <div className="space-y-2 text-sm">
              {isPackageMode && packageId ? (
                /* A package is priced per visit by the server, so the summary
                   has to be built from those figures. Reusing the single-booking
                   lines here showed one visit's cost above a whole package's
                   total — numbers that visibly refuse to add up. */
                packageQuote?.valid ? (
                  <>
                    <Line
                      label={dict.perVisit}
                      value={money(packageQuote.undiscounted_visit_price)}
                    />
                    {materialsFee > 0 && (
                      /* Folded into the per-visit price above, so it is noted
                         rather than added — listing it again would double it. */
                      <Line
                        label={dict.material}
                        value={`${dict.included} · ${money(materialsFee)}`}
                        muted
                      />
                    )}
                    <Line label={dict.visits} value={`× ${packageQuote.total_visits}`} muted />
                    {packageQuote.discount_percent > 0 && (
                      <Line
                        /* The discount alone. you_save nets off the fee and its
                           tax as well, so using it here left the lines short of
                           the total by exactly those charges. */
                        label={`${dict.packageDiscount} (${packageQuote.discount_percent}%)`}
                        value={`- ${money(packageQuote.package_discount)}`}
                        accent
                      />
                    )}
                    {packageQuote.extra_fee > 0 && (
                      <Line label={dict.serviceFee} value={`+ ${money(packageQuote.extra_fee)}`} />
                    )}
                    {packageQuote.fee_tax > 0 && (
                      <Line
                        label={`${dict.vat} (${vatPercent}%)`}
                        value={`+ ${money(packageQuote.fee_tax)}`}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-muted">{dict.pickDaysToSeePrice}</p>
                )
              ) : (
                <>
              <Line
                label={dict.serviceAmount}
                value={money((professionalDiscount > 0 ? serviceGross : serviceAmount) * occurrenceCount)}
              />
              {professionalDiscount > 0 && (
                <Line
                  label={`${dict.professionalDiscount} (${professionalPercent}%)`}
                  value={`- ${money(professionalDiscount * occurrenceCount)}`}
                  accent
                />
              )}
              {occurrenceCount > 1 && (
                <Line label={dict.times} value={`× ${occurrenceCount}`} muted />
              )}
              {materialsFee > 0 && (
                <Line label={dict.material} value={`+ ${money(materialsFee * occurrenceCount)}`} />
              )}
              {addOns
                .filter((a) => selectedAddOns.has(a.id))
                .map((a) => (
                  <Line key={a.id} label={a.name} value={`+ ${money(a.price * occurrenceCount)}`} muted />
                ))}
              {applicableDiscount > 0 && (
                <Line
                  label={campApplicable ? dict.campaignDiscount : dict.serviceDiscount}
                  value={`- ${money(applicableDiscount * occurrenceCount)}`}
                  accent
                />
              )}
              {couponDiscount > 0 && (
                <Line label={dict.couponDiscount} value={`- ${money(couponDiscount * occurrenceCount)}`} accent />
              )}
              {commitmentDiscount > 0 && (
                <Line
                  label={`${dict.commitmentDiscount} (${commitmentPercent}%)`}
                  value={`- ${money(commitmentDiscount)}`}
                  accent
                />
              )}
              {serviceFee > 0 && (
                <Line label={dict.serviceFee} value={`+ ${money(serviceFee)}`} />
              )}
              {vat > 0 && (
                <Line label={`${dict.vat} (${vatPercent}%)`} value={`+ ${money(vat)}`} />
              )}
                </>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold text-ink">{dict.total}</span>
              <span className="text-xl font-bold text-primary">{money(grandTotal)}</span>
            </div>
          </div>

          <Link
            href={`/${locale}/service/${serviceSlug}`}
            className="block text-center text-sm text-muted hover:text-primary"
          >
            ← {serviceName}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-medium text-ink">{value}</dd>
    </div>
  );
}

function Line({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={muted ? "text-muted" : "text-ink/80"}>{label}</span>
      <span className={`text-end ${accent ? "text-primary" : "text-ink"}`}>{value}</span>
    </div>
  );
}
