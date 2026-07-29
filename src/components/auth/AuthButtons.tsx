"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

export function AuthButtons({
  locale,
  dict,
  isLoggedIn,
}: {
  locale: Locale;
  dict: Dict;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.push(`/${locale}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (isLoggedIn) {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={loading}
        className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-primary disabled:opacity-60 sm:inline-block"
      >
        {dict.logout}
      </button>
    );
  }

  return (
    <Link
      href={`/${locale}/login`}
      className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-primary sm:inline-block"
    >
      {dict.login}
    </Link>
  );
}
