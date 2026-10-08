"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type HeaderTab = {
  href: string;
  label: string;
  match: string;
  /** Lights only on its own page — the home tab, which every path begins with. */
  exact?: boolean;
};

/**
 * The middle of the top bar, which is not the same list everywhere.
 *
 * Two different readers are being served. On the home page the bar is a table
 * of contents for the page itself — offers, pricing, areas, careers — because
 * everything it names is a block a few screens below. On a service page none
 * of that is on screen: the reader is choosing or booking a service, and what
 * they need is the catalogue, with the one they are reading lit.
 *
 * The catalogue is the panel's own ordered sections, so adding a service in
 * the panel adds it to this bar and nobody edits this file to do it.
 *
 * Which set is shown is decided here rather than passed in, because the header
 * is rendered once by the layout and the layout does not know what page is
 * under it. `usePathname` does.
 */
export function HeaderTabs({
  catalogue,
  pages,
  moreLabel,
}: {
  catalogue: HeaderTab[];
  pages: { href: string; label: string }[];
  moreLabel: string;
}) {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // A menu that stays open after you have gone somewhere else is a menu that
  // covers the page you asked for.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A service page, or a section's browse page — anywhere the reader is
  // working through the catalogue rather than reading the home page.
  const onCatalogue = /^\/[^/]+\/(service|category|services)(\/|$)/.test(pathname);

  if (!onCatalogue) {
    return (
      <nav className="hidden flex-1 items-center justify-center gap-5 wide:flex">
        {pages.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap text-[14px] font-medium text-ink-62 transition hover:text-green"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 wide:flex">
      {/* The tabs scroll inside their own box rather than spilling out of it.
          A centred row that is wider than the space it was given overflows at
          both ends, and the first tab was drawn on top of the logo. */}
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {catalogue.map((tab) => {
          // A tab matches its own page and anything under it, so a sub-page
          // never unlights the bar. The home tab is the exception: every path
          // on the site begins with it, and it would never go out.
          const active = tab.exact
            ? pathname === tab.match
            : pathname === tab.match || pathname.startsWith(`${tab.match}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition ${
                active ? "bg-green text-white" : "text-ink-62 hover:text-green"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* The home page's own sections, still one press away from a service
          page. Outside the scrolling box: its panel hangs below the bar, and
          an overflow box would cut it off. */}
      {pages.length > 0 && (
        <div ref={box} className="relative shrink-0">
          {/* A mark, not a word: the catalogue is what this row is for, and
              the word "More" in two languages cost it a service. The name is
              still read out and still shown on hover. */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={moreLabel}
            title={moreLabel}
            className="grid h-9 w-9 place-items-center rounded-full text-[16px] font-semibold text-ink-62 transition hover:bg-stone-hover hover:text-green"
          >
            <span aria-hidden>⋯</span>
          </button>

          {open && (
            <div className="absolute end-0 top-[calc(100%+8px)] z-50 flex min-w-[200px] flex-col rounded-[16px] border border-line bg-surface p-1.5 shadow-hover">
              {pages.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[10px] px-3 py-2 text-[14px] text-ink transition hover:bg-stone-hover hover:text-green"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
