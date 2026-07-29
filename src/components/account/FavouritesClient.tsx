"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Service } from "@/lib/types";
import { Thumb } from "@/components/Thumb";

type Dict = Record<string, string>;

export function FavouritesClient({
  locale,
  dict,
  services,
}: {
  locale: Locale;
  dict: Dict;
  services: Service[];
}) {
  const [items, setItems] = useState(services);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/account/favourite/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: id, locale }),
      });
      const data = await res.json();
      if (data.ok) setItems((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
        <li
          key={s.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <Link href={`/${locale}/service/${s.slug ?? s.id}`} className="block">
            <div className="aspect-[4/3] w-full overflow-hidden">
              <Thumb
                src={s.thumbnail_full_path || s.image_full_path || s.cover_image_full_path}
                alt={s.name}
                rounded="rounded-none"
              />
            </div>
          </Link>
          <div className="flex flex-1 flex-col p-4">
            <h3 className="line-clamp-2 text-base font-semibold text-ink">{s.name}</h3>
            <button
              type="button"
              onClick={() => remove(s.id)}
              disabled={busy === s.id}
              className="mt-3 self-start rounded-full border border-border px-4 py-1.5 text-sm font-medium text-accent-dark transition hover:border-accent disabled:opacity-60"
            >
              {dict.remove}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
