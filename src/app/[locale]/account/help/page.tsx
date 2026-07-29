import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig } from "@/lib/api";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;
  const config = await getConfig(locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{a.help}</h1>
      <p className="text-sm text-muted">{a.helpText}</p>

      <div className="space-y-3">
        {config.business_phone && (
          <a
            href={`tel:${config.business_phone}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-primary"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-light text-lg">📞</span>
            <span>
              <span className="block text-xs text-muted">{a.callUs}</span>
              <span dir="ltr" className="font-semibold text-ink">{config.business_phone}</span>
            </span>
          </a>
        )}
        {config.business_email && (
          <a
            href={`mailto:${config.business_email}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-primary"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-light text-lg">✉️</span>
            <span>
              <span className="block text-xs text-muted">{a.emailUs}</span>
              <span dir="ltr" className="font-semibold text-ink">{config.business_email}</span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
