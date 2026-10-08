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
    <div className="inline-flex shrink-0 items-center rounded-full border border-border bg-surface p-0.5 text-sm">
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          /* On a narrow screen only the language you are *not* reading is
             drawn. The pair is 133px wide — a sixth of a phone's line — and
             the header ran off the screen carrying it, taking the menu button
             with it. One button still says everything: press it to change. */
          className={`rounded-full px-3 py-1 transition ${
            loc === current
              ? "hidden bg-primary text-white wide:block"
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
