import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getConfig,
  getPackageAvailability,
  getServiceAddOns,
  getServiceDetail,
  getServicePackages,
} from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import {
  BookingWizard,
  type WizardAddOn,
  type WizardVariant,
} from "@/components/booking/BookingWizard";

type Params = Promise<{ locale: string; slug: string }>;

function toNumber(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const service = await getServiceDetail(slug, loc);
  return {
    title: service ? service.name : "Booking",
    robots: { index: false, follow: false },
  };
}

export default async function BookPage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const [service, config] = await Promise.all([
    getServiceDetail(slug, locale),
    getConfig(locale),
  ]);
  if (!service) notFound();

  const currency = currencyLabel(config, locale);

  const variants: WizardVariant[] = (service.variations ?? []).map((v) => ({
    key: v.variant_key || v.variant || "variant",
    price: toNumber(v.price),
    durationMinutes: v.duration_minutes ?? 60,
  }));
  if (variants.length === 0) {
    variants.push({
      key: "default",
      price: toNumber(service.starting_price ?? service.price ?? service.min_bidding_price),
      durationMinutes: 60,
    });
  }

  // Subscription packages for this sub-category, plus the weekdays it can be
  // booked on — the union across every provider serving it, so a day is only
  // disabled when nobody works it.
  const [servicePackages, availability] = await Promise.all([
    getServicePackages(service.sub_category_id ?? "", locale),
    getPackageAvailability(service.sub_category_id ?? null, locale),
  ]);

  // Real, admin-managed add-ons for this service (by category or direct link)
  const rawAddOns = await getServiceAddOns(service.id, locale);
  const addOns: WizardAddOn[] = rawAddOns.map((a) => ({
    id: a.id,
    name: a.name,
    price: toNumber(a.price),
    image: a.image_full_path,
  }));

  return (
    <BookingWizard
      locale={locale}
      dict={dict.booking as unknown as Record<string, string>}
      currency={currency}
      vatPercent={toNumber(config.vat_percentage)}
      serviceFee={toNumber(config.additional_charge_fee_amount)}
      materialCharge={toNumber(config.material_charge)}
      professionalTiers={config.professional_discount_tiers ?? []}
      serviceDiscount={service.service_discount ?? []}
      campaignDiscount={service.campaign_discount ?? []}
      categoryDiscount={service.category?.category_discount ?? []}
      categoryCampaignDiscount={service.category?.campaign_discount ?? []}
      serviceId={service.id}
      categoryId={service.category_id ?? ""}
      subCategoryId={service.sub_category_id ?? ""}
      serviceName={service.name}
      serviceSlug={slug}
      variants={variants}
      addOns={addOns}
      workStart={service.service_availability?.time_schedule?.start_time ?? null}
      workEnd={service.service_availability?.time_schedule?.end_time ?? null}
      repeatDiscountTiers={
        (config as unknown as { repeat_discount_tiers?: { min_services: number; discount_percent: number }[] })
          .repeat_discount_tiers ?? []
      }
      servicePackages={servicePackages}
      selectableWeekdays={availability.selectable_weekdays}
      providerOffDays={availability.off_days_iso}
      maxDaysPerWeek={availability.max_days_per_week}
      providerId={service.service_availability?.provider_id ?? null}
    />
  );
}
