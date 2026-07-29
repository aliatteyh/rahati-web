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
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push({ date: d, weekday: wd.format(d), day: dn.format(d) });
    }
    return list;
  }, [locale]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h < 20; h++) {
      for (const m of [0, 30]) {
        const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const endM = m + 30;
        const endH = endM === 60 ? h + 1 : h;
        const end = `${String(endH).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
        slots.push(`${start}-${end}`);
      }
    }
    return slots;
  }, []);

  const addOnsTotal = useMemo(
    () =>
      addOns
        .filter((a) => selectedAddOns.has(a.id))
        .reduce((sum, a) => sum + a.price, 0),
    [addOns, selectedAddOns]
  );

  // Build a "YYYY-MM-DD HH:mm:00" schedule from the chosen day + time slot start.
  function buildSchedule(): string {
    const d = days[dateIndex].date;
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const start = (timeSlot ?? "09:00").split("-")[0];
    return `${ymd} ${start}:00`;
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
        const schedule = encodeURIComponent(buildSchedule());
        const instr = encodeURIComponent(instructions);
        router.push(`/${locale}/checkout?schedule=${schedule}&instructions=${instr}`);
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
  const grandTotal = Math.max(0, taxableBase + vat + serviceFee);

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

  const canProceed = step < 3 || timeSlot !== null;

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
        <div className="rounded-2xl border border-border bg-surface p-6">
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
              {/* Frequency */}
              <div className="rounded-xl border border-primary bg-primary-light px-4 py-3">
                <p className="text-sm text-muted">{dict.frequency}</p>
                <p className="mt-1 inline-flex items-center gap-2 font-semibold text-primary-dark">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {dict.oneTime}
                </p>
              </div>

              {/* Date */}
              <div>
                <p className="mb-3 font-semibold text-ink">{dict.whenQuestion}</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {days.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDateIndex(i)}
                      className={`flex shrink-0 flex-col items-center rounded-2xl border px-3 py-2 transition ${
                        i === dateIndex
                          ? "border-primary bg-primary text-white"
                          : "border-border text-muted hover:border-primary"
                      }`}
                    >
                      <span className="text-xs">{d.weekday}</span>
                      <span className="text-lg font-bold">{d.day}</span>
                    </button>
                  ))}
                </div>
              </div>

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
              <Row label={dict.frequency} value={dict.oneTime} />
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
              <Line label={dict.serviceAmount} value={money(serviceAmount)} />
              {materialsFee > 0 && (
                <Line label={dict.material} value={`+ ${money(materialsFee)}`} />
              )}
              {addOns
                .filter((a) => selectedAddOns.has(a.id))
                .map((a) => (
                  <Line key={a.id} label={a.name} value={`+ ${money(a.price)}`} muted />
                ))}
              {applicableDiscount > 0 && (
                <Line
                  label={campApplicable ? dict.campaignDiscount : dict.serviceDiscount}
                  value={`- ${money(applicableDiscount)}`}
                  accent
                />
              )}
              {couponDiscount > 0 && (
                <Line label={dict.couponDiscount} value={`- ${money(couponDiscount)}`} accent />
              )}
              {serviceTax > 0 && (
                <Line label={`${dict.vat} (${serviceTax}%)`} value={`+ ${money(vat)}`} />
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
