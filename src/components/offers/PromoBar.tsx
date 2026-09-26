"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Offer } from "@/lib/api";
import { compactCountdown, useCountdown } from "./useCountdown";
import { reportSeen } from "./reportSeen";

/**
 * The strip above the header.
 *
 * It rotates when there is more than one offer, because a bar that shows the
 * same thing on every page becomes furniture within a day, and the second
 * offer is never seen at all.
 *
 * Closing it hides it for the rest of the session rather than for ever. A
 * visitor who dismisses an announcement has said "not now", and holding them
 * to that across every future visit quietly retires the bar for your most
 * regular customers.
 */
export function PromoBar({
  offers,
  serverTime,
  locale,
  dict,
}: {
  offers: Offer[];
  serverTime: string;
  locale: Locale;
  dict: Record<string, string>;
}) {
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(true);

  // Starts hidden and is shown once the session is known, so a bar the
  // visitor already dismissed never flashes before disappearing.
  useEffect(() => {
    try {
      setClosed(sessionStorage.getItem("rahati_bar_closed") === "1");
    } catch {
      setClosed(false);
    }
  }, []);

  useEffect(() => {
    if (offers.length < 2) return;
    const rotate = setInterval(() => setIndex((i) => (i + 1) % offers.length), 6000);
    return () => clearInterval(rotate);
  }, [offers.length]);

  const offer = offers[index];
  const left = useCountdown(offer?.ends_at ?? null, serverTime);

  useEffect(() => {
    if (offer && !closed) reportSeen(offer.id, "bar");
  }, [offer?.id, closed]);

  if (closed || !offer || left.finished) return null;

  const clock = compactCountdown(left);
  const target = offer.service_slug
    ? `/${locale}/service/${offer.service_slug}/book?offer=${offer.code}`
    : `/${locale}/services?offer=${offer.code}`;

  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        {offer.tag && (
          <span className="hidden shrink-0 rounded-full bg-[#e8d9ae] px-3 py-0.5 text-xs font-semibold text-[#6b5a24] sm:inline">
            {offer.tag}
          </span>
        )}

        <span className="min-w-0 flex-1 truncate">
          {offer.big_number && <strong className="me-1">{offer.big_number}</strong>}
          {offer.headline}
          <span className="mx-2 opacity-50">·</span>
          <span className="font-mono">{offer.code}</span>
        </span>

        {clock && (
          <span className="hidden shrink-0 font-mono text-xs opacity-80 sm:inline" aria-label={dict.endsIn}>
            {clock}
          </span>
        )}

        <Link href={target} className="shrink-0 font-semibold text-primary-light underline-offset-2 hover:underline">
          {dict.bookNow} →
        </Link>

        <button
          type="button"
          aria-label={dict.close}
          className="shrink-0 opacity-60 transition hover:opacity-100"
          onClick={() => {
            setClosed(true);
            try {
              sessionStorage.setItem("rahati_bar_closed", "1");
            } catch {
              /* a private window still gets to close it, just not to remember */
            }
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
