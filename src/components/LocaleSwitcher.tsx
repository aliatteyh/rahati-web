"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === current) return;
    const segments = pathname.split("/");
    // segments[0] === "" , segments[1] === locale
    segments[1] = next;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    router.push(segments.join("/") || `/${next}`);
  }

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-surface p-0.5 text-sm">
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          className={`rounded-full px-3 py-1 transition ${
            loc === current
              ? "bg-primary text-white"
              : "text-muted hover:text-ink"
          }`}
          aria-current={loc === current}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
