import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig } from "@/lib/api";
import { authGet } from "@/lib/account";
import { ChatWindow } from "@/components/chat/ChatWindow";

interface BookingLite {
  id?: string;
  readable_id?: string | number;
  customer?: { id?: string } | null;
}

export default async function BookingChatPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;
  const common = dict.common as unknown as Record<string, string>;

  const [b, config] = await Promise.all([
    authGet<BookingLite>(`/api/v1/customer/booking/${encodeURIComponent(id)}`, locale, {}),
    getConfig(locale),
  ]);
  const businessName = config.business_name || dict.brand;

  return (
    <div className="space-y-4">
      {/* Back to the list, not to the old detail page: the booking's own
          screen is a sheet on the list now, and the page that used to be
          here is the one design this replaced. */}
      <Link href={`/${locale}/account/bookings`} className="text-sm text-primary">
        ← {a.bookings} {b.readable_id ? `· #${b.readable_id}` : ""}
      </Link>
      <div>
        <h1 className="text-xl font-bold text-ink">{a.messages}</h1>
        <p className="text-sm text-muted">{a.chatWith}</p>
      </div>

      <ChatWindow
        bookingId={id}
        locale={locale}
        businessName={businessName}
        meId={b.customer?.id}
        dict={{
          you: a.you,
          provider: a.roleProvider,
          serviceman: a.roleServiceman,
          admin: businessName,
          typeMessage: a.typeMessage,
          send: a.send,
          attach: a.attach,
          noMessages: a.noMessages,
          loading: common.loading,
          chatError: a.chatError,
        }}
      />
    </div>
  );
}
