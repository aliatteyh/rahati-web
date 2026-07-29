import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { authGetList } from "@/lib/account";
import { Thumb } from "@/components/Thumb";

interface Notif {
  id?: string;
  title?: string;
  description?: string;
  cover_image_full_path?: string | null;
  created_at?: string;
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const items = await authGetList<Notif>(
    "/api/v1/customer/notification?limit=50&offset=1",
    locale
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{a.notifications}</h1>

      {items.length === 0 ? (
        <p className="text-sm text-muted">{a.noNotifications}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((n, i) => (
            <li
              key={n.id ?? i}
              className="flex gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <Thumb src={n.cover_image_full_path} alt={n.title ?? "🔔"} rounded="rounded-xl" />
              </div>
              <div className="min-w-0 flex-1">
                {n.title && <p className="font-semibold text-ink">{n.title}</p>}
                {n.description && (
                  <p className="mt-1 text-sm text-muted">{n.description}</p>
                )}
                {n.created_at && (
                  <p className="mt-2 text-xs text-muted">{n.created_at.slice(0, 10)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
