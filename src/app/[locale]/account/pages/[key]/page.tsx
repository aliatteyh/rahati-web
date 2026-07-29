import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

const TITLE_KEY: Record<string, string> = {
  about_us: "aboutUs",
  terms_and_conditions: "terms",
  privacy_policy: "privacy",
  cancellation_policy: "cancellation",
  refund_policy: "refund",
};

async function fetchJson(path: string) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json", zoneId: "configuration" },
      cache: "no-store",
    });
    const json = await res.json();
    return json?.content ?? null;
  } catch {
    return null;
  }
}

/** Pull the HTML string out of a DataSetting / BusinessPageSetting payload. */
function extractHtml(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  const obj = node as Record<string, unknown>;
  const v = obj.value ?? obj.content ?? obj.description;
  return typeof v === "string" ? v : "";
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string; key: string }>;
}) {
  const { locale: raw, key } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  // Fixed policy pages come from config/pages; custom business pages (e.g. help)
  // come from config/page-details/{key}.
  const pages = (await fetchJson("/api/v1/customer/config/pages")) as
    | Record<string, unknown>
    | null;
  let html = extractHtml(pages?.[key]);
  if (!html) {
    html = extractHtml(await fetchJson(`/api/v1/customer/config/page-details/${encodeURIComponent(key)}`));
  }

  const title = a[TITLE_KEY[key] ?? ""] ?? key.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {html ? (
        <div
          className="prose prose-sm max-w-none text-ink [&_a]:text-primary [&_h1]:mt-6 [&_h2]:mt-5 [&_h2]:font-semibold [&_li]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:ps-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-muted">{a.loadError}</p>
      )}
    </div>
  );
}
