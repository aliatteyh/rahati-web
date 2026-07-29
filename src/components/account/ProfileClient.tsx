"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export function ProfileClient({
  locale,
  dict,
  authDict,
  initial,
}: {
  locale: Locale;
  dict: Dict;
  authDict: Dict;
  initial: ProfileData;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof ProfileData, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDone(false);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(data.message || dict.loadError);
      }
    } catch {
      setError(dict.loadError);
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, key: keyof ProfileData, opts: { type?: string; readOnly?: boolean } = {}) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      <input
        type={opts.type ?? "text"}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        readOnly={opts.readOnly}
        dir={key === "phone" ? "ltr" : undefined}
        className={`w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary ${
          opts.readOnly ? "cursor-not-allowed bg-surface-soft text-muted" : "bg-surface"
        }`}
      />
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {field(authDict.firstName, "first_name")}
        {field(authDict.lastName, "last_name")}
      </div>
      {field(authDict.email, "email", { type: "email" })}
      {field(authDict.phone, "phone", { readOnly: true })}

      {error && <p className="text-sm text-accent-dark">{error}</p>}
      {done && <p className="text-sm text-primary">{dict.saved}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
      >
        {loading ? dict.saving : dict.save}
      </button>
    </form>
  );
}
