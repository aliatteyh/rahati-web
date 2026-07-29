"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

export function AccountMenu({
  locale,
  dict,
  logoutLabel,
}: {
  locale: Locale;
  dict: Dict;
  logoutLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const base = `/${locale}/account`;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      setOpen(false);
      router.push(`/${locale}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const items: { href: string; label: string }[] = [
    { href: `${base}/profile`, label: dict.profile },
    { href: `${base}/bookings`, label: dict.bookings },
    { href: `${base}/coupons`, label: dict.coupons },
    { href: `${base}/wallet`, label: dict.wallet },
    { href: `${base}/favourites`, label: dict.favourites },
    { href: `${base}/service-area`, label: dict.serviceArea },
  ];
  const pages: { href: string; label: string }[] = [
    { href: `${base}/pages/about_us`, label: dict.aboutUs },
    { href: `${base}/pages/terms_and_conditions`, label: dict.terms },
    { href: `${base}/pages/privacy_policy`, label: dict.privacy },
    { href: `${base}/pages/cancellation_policy`, label: dict.cancellation },
    { href: `${base}/pages/refund_policy`, label: dict.refund },
    { href: `${base}/help`, label: dict.help },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium text-ink transition hover:border-primary"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-light text-xs">👤</span>
        <span className="hidden sm:inline">{dict.myAccount}</span>
      </button>

      {open && (
        <div className="absolute end-0 z-[80] mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-xl">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-ink hover:bg-surface-soft"
            >
              {it.label}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          {pages.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-muted hover:bg-surface-soft"
            >
              {it.label}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={logout}
            disabled={loading}
            className="block w-full px-4 py-2.5 text-start text-sm font-medium text-accent-dark hover:bg-surface-soft disabled:opacity-60"
          >
            {logoutLabel}
          </button>
        </div>
      )}
    </div>
  );
}
