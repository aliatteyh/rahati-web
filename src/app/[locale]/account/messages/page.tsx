import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { authGetList } from "@/lib/account";

interface Channel {
  id?: string;
  reference_id?: string | null;
  reference_type?: string | null;
  updated_at?: string;
}

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const channels = await authGetList<Channel>(
    "/api/v1/customer/chat/channel-list?limit=50&offset=1",
    locale
  );
  const bookingChats = channels.filter((c) => c.reference_type === "booking_id" && c.reference_id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{a.messages}</h1>

      {bookingChats.length === 0 ? (
        <p className="text-sm text-muted">{a.noMessages}</p>
      ) : (
        <ul className="space-y-3">
          {bookingChats.map((c, i) => (
            <li key={c.id ?? i}>
              <Link
                href={`/${locale}/account/bookings/${c.reference_id}/chat`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-4 transition hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-light text-lg">
                    💬
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{a.chatWith}</p>
                    {c.updated_at && (
                      <p className="text-xs text-muted">{c.updated_at.slice(0, 10)}</p>
                    )}
                  </div>
                </div>
                <span className="text-primary">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
