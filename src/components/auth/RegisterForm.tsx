"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { LocationPicker, type ResolvedLocation } from "@/components/location/LocationPicker";

type Dict = Record<string, string>;

export function RegisterForm({
  locale,
  dict,
  locationDict,
  initialPhone = "",
}: {
  locale: Locale;
  dict: Dict;
  locationDict: Dict;
  initialPhone?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"location" | "details">("location");
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    building: "",
    floor: "",
    apartment: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Registration requires a phone verified via OTP on /login first.
  useEffect(() => {
    if (!initialPhone) router.replace(`/${locale}/login`);
  }, [initialPhone, locale, router]);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: initialPhone,
          city: location.city,
          area: location.area,
          lat: location.lat,
          lon: location.lon,
          locale,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/${locale}`);
        router.refresh();
      } else {
        setError(data.message || dict.registerFailed);
      }
    } catch {
      setError(dict.registerFailed);
    } finally {
      setLoading(false);
    }
  }

  const field = (
    label: string,
    key: keyof typeof form,
    opts: { type?: string; required?: boolean } = {}
  ) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      <input
        type={opts.type ?? "text"}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        required={opts.required}
        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-bold text-ink">{dict.registerTitle}</h1>

        {step === "location" ? (
          <>
            <p className="mt-1 text-sm text-muted">{locationDict.chooseLocation}</p>
            <div className="mt-6">
              <LocationPicker
                dict={locationDict}
                autoDetect
                onResolved={(loc) => setLocation(loc)}
              />
            </div>
            <button
              type="button"
              disabled={!location}
              onClick={() => setStep("details")}
              className="mt-6 w-full rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              {dict.continue}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">{dict.registerOtpSubtitle}</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {/* Verified phone — read-only */}
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">{dict.phone}</label>
                <input
                  value={initialPhone}
                  readOnly
                  dir="ltr"
                  className="w-full cursor-not-allowed rounded-xl border border-border bg-surface-soft px-4 py-2.5 text-muted outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {field(dict.firstName, "first_name", { required: true })}
                {field(dict.lastName, "last_name", { required: true })}
              </div>
              {field(dict.email, "email", { type: "email", required: true })}

              <div className="pt-2">
                <h2 className="text-sm font-semibold text-ink">{dict.addressTitle}</h2>
              </div>
              {field(dict.building, "building")}
              <div className="grid gap-4 sm:grid-cols-2">
                {field(dict.floor, "floor")}
                {field(dict.apartment, "apartment")}
              </div>

              {/* Address details from the chosen location (read-only summary) */}
              {location && (
                <div className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{dict.addressDetailsTitle}</span>
                    <button
                      type="button"
                      onClick={() => setStep("location")}
                      className="text-xs font-medium text-primary"
                    >
                      {locationDict.change}
                    </button>
                  </div>
                  {location.zoneName && (
                    <p className="mt-1 text-muted">
                      {locationDict.currentArea}: <span className="text-ink">{location.zoneName}</span>
                    </p>
                  )}
                  {(location.city || location.area) && (
                    <p className="text-muted">
                      {[location.area, location.city].filter(Boolean).join("، ")}
                    </p>
                  )}
                  {location.formattedAddress && (
                    <p className="text-muted">{location.formattedAddress}</p>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-accent-dark">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
              >
                {loading ? dict.loading : dict.createAccount}
              </button>
            </form>
          </>
        )}

        <p className="mt-5 text-center text-sm text-muted">
          {dict.haveAccount}{" "}
          <Link href={`/${locale}/login`} className="font-semibold text-primary">
            {dict.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
