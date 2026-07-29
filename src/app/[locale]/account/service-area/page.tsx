import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getZoneInfo } from "@/lib/zone";
import { ServiceAreaLocation } from "@/components/account/ServiceAreaLocation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

interface Zone {
  id?: string;
  name?: string;
}

async function getZones(locale: Locale): Promise<Zone[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/customer/service/area-availability?limit=200&offset=1`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-localization": locale,
          zoneId: "configuration",
        },
        cache: "no-store",
      }
    );
    const json = await res.json();
    const content = json?.content;
    return (Array.isArray(content) ? content : content?.data) ?? [];
  } catch {
    return [];
  }
}

export default async function ServiceAreaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;
  const loc = dict.location as unknown as Record<string, string>;

  const [zones, current] = await Promise.all([getZones(locale), getZoneInfo()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{a.serviceArea}</h1>
        <p className="mt-1 text-sm text-muted">{a.serviceAreaSub}</p>
        {current?.name && (
          <p className="mt-2 text-sm">
            <span className="text-muted">{loc.currentArea}: </span>
            <span className="font-semibold text-primary">{current.name}</span>
          </p>
        )}
      </div>

      <ServiceAreaLocation dict={loc} />

      {zones.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {zones.map((z, i) => (
            <li
              key={z.id ?? i}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink"
            >
              <span className="text-primary">📍</span>
              {z.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
