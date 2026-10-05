"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The header's navigation on a narrow screen.
 *
 * The inline row of links is hidden below the wide breakpoint, and nothing
 * replaced it: a phone visitor could reach no section of the site, could not
 * set their area, and could not press the one button the page is built around.
 * The links were on the page, drawn at zero width, which is the same as absent.
 *
 * Everything that drops out of the row at this width comes back here, in the
 * order it has on the page.
 */
export function MobileMenu({
  items,
  bookHref,
  bookLabel,
  openLabel,
  closeLabel,
}: {
  items: { href: string; label: string }[];
  bookHref: string;
  bookLabel: string;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  // Escape closes it, because a panel that covers the page needs a way out
  // that does not depend on hitting a small button.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="wide:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? closeLabel : openLabel}
        className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition hover:border-green hover:text-green"
      >
        {/* Drawn rather than an icon font: three rules that become a cross, so
            the button says which of the two states it is in. */}
        <span className="relative block h-[14px] w-[18px]">
          <span
            className={`absolute inset-x-0 block h-[1.5px] rounded bg-current transition-all duration-200 ${
              open ? "top-[6px] rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute inset-x-0 top-[6px] block h-[1.5px] rounded bg-current transition-opacity duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute inset-x-0 block h-[1.5px] rounded bg-current transition-all duration-200 ${
              open ? "top-[6px] -rotate-45" : "top-[12px]"
            }`}
          />
        </span>
      </button>

      {open && (
        <>
          {/* Anything outside the panel closes it, which is what a reader
              expects of a sheet that covers what they were reading. */}
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-[72px] z-40 cursor-default bg-ink/20 backdrop-blur-[2px]"
          />

          <div className="fixed inset-x-0 top-[72px] z-50 border-b border-line bg-paper shadow-[0_18px_40px_-24px_rgba(22,33,29,0.45)]">
            <nav className="mx-auto flex w-full max-w-page flex-col px-[clamp(20px,4vw,48px)] py-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-line/60 py-3.5 text-[15.5px] font-medium text-ink transition last:border-0 hover:text-green"
                >
                  {item.label}
                </Link>
              ))}

              <Link
                href={bookHref}
                onClick={() => setOpen(false)}
                className="my-3 rounded-full bg-ink px-5 py-3 text-center text-[15px] font-semibold text-white transition hover:bg-green"
              >
                {bookLabel}
              </Link>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
