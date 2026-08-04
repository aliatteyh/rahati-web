"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { RecentSearch } from "@/lib/api";

/**
 * The customer's own recent search terms, as chips.
 *
 * Searching for a service is rarely a one-shot act — people compare, leave, and
 * come back. Retyping the term each time is the friction this removes.
 *
 * History is per-customer and lives on the server, so it follows them from phone
 * to laptop; a signed-out visitor has none and sees nothing, which is also the
 * privacy-preserving default.
 */
export function RecentSearches({
  locale,
  items,
  title,
  clearLabel,
}: {
  locale: Locale;
  items: RecentSearch[];
  title: string;
  clearLabel: string;
}) {
  // Cleared locally the moment the request succeeds — waiting for a page refresh
  // to make history disappear reads as the control not having worked.
  const [visible, setVisible] = useState(items);
  const [busy, setBusy] = useState(false);

  async function clear() {
    setBusy(true);
    try {
      const res = await fetch("/api/search/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if ((await res.json())?.ok) setVisible([]);
    } catch {
      /* Leave the chips in place; nothing was deleted. */
    } finally {
      setBusy(false);
    }
  }

  if (visible.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <button
          type="button"
          onClick={clear}
          disabled={busy}
          className="text-sm text-muted underline-offset-2 transition hover:text-accent-dark hover:underline disabled:opacity-50"
        >
          {clearLabel}
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {visible.map((r) => (
          <li key={r.id}>
            <Link
              href={`/${locale}/search?q=${encodeURIComponent(r.keyword)}`}
              className="inline-block rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-ink transition hover:border-primary hover:text-primary"
            >
              {r.keyword}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
