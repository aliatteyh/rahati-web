"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

/**
 * The search input.
 *
 * A plain form navigation rather than live results: the query lands in the URL,
 * so a search can be shared, bookmarked and reached with the back button — and
 * the page keeps rendering on the server like every other listing here.
 */
export function SearchBox({
  locale,
  initial = "",
  placeholder,
  label,
  compact = false,
}: {
  locale: Locale;
  initial?: string;
  placeholder: string;
  label: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = value.trim();
    router.push(term ? `/${locale}/search?q=${encodeURIComponent(term)}` : `/${locale}/search`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-ink outline-none transition placeholder:text-muted focus:border-primary ${
          compact ? "h-10 text-sm" : "h-12"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full bg-primary px-5 font-semibold text-white transition hover:bg-primary-dark ${
          compact ? "h-10 text-sm" : "h-12"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
