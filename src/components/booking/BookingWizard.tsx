"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { DiscountLike, ProfessionalTier } from "@/lib/types";

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
  serviceTax: number;
  serviceFee: number;
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
}

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
  serviceTax,
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
  const [bookingMode, setBookingMode] = useState<"once" | "multiple">("once");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "custom">("daily");
  // Daily = a date range [dateIndex .. rangeEndIndex] into `days`.
  const [rangeEndIndex, setRangeEndIndex] = useState(1);
  // Weekly = a set of weekdays (0=Sun..6=Sat) repeated over `weeks` weeks from dateIndex.
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [weeks, setWeeks] = useState(2);
  // Custom = specific days picked from `days`.
  const [customDays, setCustomDays] = useState<Set<number>>(new Set());

  const variant = safeVariants[variantIndex];

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
    if (frequency === "custom") {
      const idxs = customDays.size > 0 ? [...customDays].sort((a, b) => a - b) : [dateIndex];
      return idxs.map((i) => ({ date: scheduleFor(days[i].date) }));
    }
    if (frequency === "weekly") {
      // Selected weekdays repeated across `weeks` weeks, starting from dateIndex.
      const start = days[dateIndex].date;
      const out: { date: string }[] = [];
      for (let offset = 0; offset < weeks * 7; offset++) {
        const d = new Date(start);
        d.setDate(d.getDate() + offset);
        if (weekdays.has(d.getDay())) out.push({ date: scheduleFor(d) });
      }
      return out;
    }
    // Daily = every day in the inclusive range [start, end].
    const a = Math.min(dateIndex, rangeEndIndex);
    const b = Math.max(dateIndex, rangeEndIndex);
    const out: { date: string }[] = [];
    for (let i = a; i <= b; i++) out.push({ date: scheduleFor(days[i].date) });
    return out;
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
          locale,
        }),
      });
      const data = await res.json();
      if (data.needsLogin) {
        router.push(`/${locale}/login`);
        return;
      }
      if (data.ok) {
        const instr = encodeURIComponent(instructions);
        if (bookingMode === "multiple") {
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
    bookingMode === "multiple" ? Math.max(1, buildDates().length) : 1;

  // Service amount includes professionals: base price × count, with the tier discount applied
  const serviceAmount = variant.price * professionals * (1 - tierPercent / 100);
  const materialsFee = materials ? materialCharge : 0;
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
  const vat = (taxableBase * serviceTax) / 100;
  // Per-occurrence charges repeat for every date; the service fee is charged
  // once. Mirrors the backend repeat total in placeRepeatBookingRequest.
  const grandTotal = Math.max(0, (taxableBase + vat) * occurrenceCount + serviceFee);

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
  const recurringValid =
    bookingMode === "once"
      ? true
      : frequency === "weekly"
        ? weekdays.size > 0
        : frequency === "custom"
          ? customDays.size > 0
          : true; // daily is always a valid range
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

              {/* Materials */}
              <div>
                <p className="mb-3 font-semibold text-ink">{dict.materialsQuestion}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMaterials(false)}
                    className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                      !materials
                        ? "border-primary bg-primary-light text-primary-dark"
                        : "border-border text-muted hover:border-primary"
                    }`}
                  >
                    {dict.materialsNo}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterials(true)}
                    className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                      materials
                        ? "border-primary bg-primary-light text-primary-dark"
                        : "border-border text-muted hover:border-primary"
                    }`}
                  >
                    {dict.materialsYes}
                  </button>
                </div>
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
                <div className="grid grid-cols-2 gap-2">
                  {(["once", "multiple"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBookingMode(m)}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        bookingMode === m
                          ? "border-primary bg-primary-light text-primary-dark"
                          : "border-border text-muted hover:border-primary"
                      }`}
                    >
                      {m === "once" ? dict.onlyOnce : dict.multipleTimes}
                    </button>
                  ))}
                </div>

                {bookingMode === "multiple" && (
                  <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-soft p-4">
                    <div className="flex flex-wrap gap-2">
                      {(["daily", "weekly", "custom"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFrequency(f)}
                          className={`rounded-full border px-4 py-1.5 text-sm transition ${
                            frequency === f
                              ? "border-primary bg-primary text-white"
                              : "border-border text-muted hover:border-primary"
                          }`}
                        >
                          {dict[f]}
                        </button>
                      ))}
                    </div>
                    {frequency === "custom" && (
                      <p className="text-xs text-muted">{dict.customHint}</p>
                    )}
                    {frequency === "daily" && (
                      <p className="text-xs text-muted">{dict.dailyHint}</p>
                    )}
                    {frequency === "weekly" && (
                      <div className="space-y-3">
                        <div>
                          <p className="mb-2 text-sm font-medium text-ink">{dict.selectWeekdays}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {weekdayNames.map((name, i) => {
                              const on = weekdays.has(i);
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() =>
                                    setWeekdays((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(i)) next.delete(i);
                                      else next.add(i);
                                      return next;
                                    })
                                  }
                                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                    on
                                      ? "border-primary bg-primary text-white"
                                      : "border-border text-muted hover:border-primary"
                                  }`}
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
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
                      </div>
                    )}
                    <p className="text-xs text-muted">{dict.offDaysNote}</p>
                  </div>
                )}
              </div>

              {/* Date */}
              {(() => {
                const multiple = bookingMode === "multiple";
                const isCustom = multiple && frequency === "custom";
                const isDaily = multiple && frequency === "daily";
                const rangeLo = Math.min(dateIndex, rangeEndIndex);
                const rangeHi = Math.max(dateIndex, rangeEndIndex);
                const heading = isCustom
                  ? dict.selectDates
                  : isDaily
                    ? dict.dateRange
                    : multiple && frequency === "weekly"
                      ? dict.startDay
                      : dict.whenQuestion;
                return (
                  <div>
                    <p className="mb-3 font-semibold text-ink">{heading}</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {days.map((d, i) => {
                        const active = isCustom
                          ? customDays.has(i)
                          : isDaily
                            ? i >= rangeLo && i <= rangeHi
                            : i === dateIndex;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (isCustom) {
                                setCustomDays((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(i)) next.delete(i);
                                  else next.add(i);
                                  return next;
                                });
                              } else if (isDaily) {
                                // First tap sets the start (and collapses the range);
                                // a later tap on/after the start sets the end.
                                if (i < dateIndex || i === rangeEndIndex) {
                                  setDateIndex(i);
                                  setRangeEndIndex(i);
                                } else {
                                  setRangeEndIndex(i);
                                }
                              } else {
                                setDateIndex(i);
                              }
                            }}
                            className={`flex shrink-0 flex-col items-center rounded-2xl border px-3 py-2 transition ${
                              active
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
                  bookingMode === "once"
                    ? dict.onlyOnce
                    : `${dict[frequency]} (${recurringValid ? buildDates().length : 0})`
                }
              />
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
              <Line label={dict.serviceAmount} value={money(serviceAmount * occurrenceCount)} />
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
              {serviceTax > 0 && (
                <Line label={`${dict.vat} (${serviceTax}%)`} value={`+ ${money(vat * occurrenceCount)}`} />
              )}
              {serviceFee > 0 && (
                <Line label={dict.serviceFee} value={`+ ${money(serviceFee)}`} />
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
