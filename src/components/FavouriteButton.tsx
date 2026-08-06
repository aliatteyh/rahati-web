"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

/**
 * The heart that fills a customer's favourites list.
 *
 * The list page has always existed; nothing anywhere put a service into it, so
 * it could only ever be empty. This is the missing half.
 *
 * It sits on the artwork of a service card, which is inside a link — hence the
 * stopped propagation: tapping the heart must not also open the service.
 *
 * Signed out, it sends the customer to log in and comes back here. Saving for
 * later is meaningless without an account to save it against, and a heart that
 * silently does nothing is worse than one that explains itself.
 */
export function FavouriteButton({
  serviceId,
  locale,
  initial = false,
  label,
}: {
  serviceId: string;
  locale: Locale;
  initial?: boolean;
  label: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    const next = !on;
    // Filled immediately: the request is the slow part, and a heart that waits
    // for the network feels broken. Reverted below if the server disagrees.
    setOn(next);
    setBusy(true);

    try {
      const res = await fetch("/api/account/favourite/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: serviceId, favourite: next, locale }),
      });

      if (res.status === 401) {
        setOn(!next);
        router.push(`/${locale}/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) setOn(!next);
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-full bg-surface/95 shadow-sm backdrop-blur transition hover:scale-105"
    >
      <svg
        className={`h-4 w-4 transition ${on ? "text-accent" : "text-muted"}`}
        viewBox="0 0 24 24"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d="M12 21s-7.5-4.7-9.3-9A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.3 6c-1.8 4.3-9.3 9-9.3 9z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
