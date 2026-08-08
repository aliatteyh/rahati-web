"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { LocationPicker, type ResolvedLocation } from "@/components/location/LocationPicker";
import { StripeCardForm } from "@/components/checkout/StripeCardForm";

type Dict = Record<string, string>;

export interface CartItem {
  id?: string;
  service_cost?: number;
  quantity?: number;
  professional_count?: number;
  professional_discount?: number;
  material_charge?: number;
  add_on_total?: number;
  discount_amount?: number;
  campaign_discount?: number;
  coupon_discount?: number;
  tax_amount?: number;
  total_cost?: number;
  service?: { name?: string } | null;
}

export interface Address {
  id?: number;
  address?: string;
  address_label?: string;
  contact_person_name?: string;
  contact_person_number?: string;
  city?: string;
}

interface Gateway {
  key: string;
  title: string;
}

/**
 * A way to pay that happens outside the system — the admin defines what the
 * customer is shown (`info`) and what they must send back (`fields`) so the
 * money can be matched to the booking.
 */
export interface OfflineMethod {
  id: string;
  name: string;
  info: { title: string; data: string }[];
  fields: { name: string; required: boolean }[];
}

/** Field names come from the admin as snake_case keys, not sentences. */
const humanise = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function CheckoutClient({
  locale,
  dict,
  locationDict,
  addressDict,
  currency,
  cart,
  addresses,
  gateways,
  cashAllowed = true,
  offlineMethods = [],
  serviceFee,
  vatPercent,
  serverTotal,
  zoneId,
  schedule,
  serviceType = "regular",
  dates = "",
}: {
  locale: Locale;
  dict: Dict;
  locationDict: Dict;
  authDict: Dict;
  addressDict: Dict;
  currency: string;
  cart: CartItem[];
  addresses: Address[];
  gateways: Gateway[];
  cashAllowed?: boolean;
  offlineMethods?: OfflineMethod[];
  serviceFee: number;
  /** Global VAT rate; charged on the service fee only. */
  vatPercent: number;
  serverTotal: number;
  zoneId: string;
  schedule: string;
  instructions: string;
  serviceType?: "regular" | "repeat";
  dates?: string;
}) {
  const isRepeat = serviceType === "repeat";
  const repeatDates: string[] = (() => {
    if (!isRepeat || !dates) return [];
    try {
      const parsed = JSON.parse(dates) as { date?: string }[];
      return parsed.map((d) => d.date ?? "").filter(Boolean);
    } catch {
      return [];
    }
  })();
  const money = (n: number) => `${currency} ${n.toLocaleString(locale === "ar" ? "ar" : "en")}`;

  const [addressList, setAddressList] = useState(addresses);
  const [addressId, setAddressId] = useState<number | undefined>(addresses[0]?.id);
  const [adding, setAdding] = useState(addresses.length === 0);
  const [newLoc, setNewLoc] = useState<ResolvedLocation | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [savingAddr, setSavingAddr] = useState(false);

  const [when, setWhen] = useState(schedule ? schedule.slice(0, 16).replace(" ", "T") : "");
  // An offline choice is stored as "offline:<id>" so one radio group can cover
  // all three families; the id is what the backend needs to match the transfer.
  const [method, setMethod] = useState<string>(() => {
    if (cashAllowed) return "cash_after_service";
    if (gateways.length > 0) return gateways[0].key;
    if (offlineMethods.length > 0) return `offline:${offlineMethods[0].id}`;
    return "cash_after_service";
  });
  const offlineChosen = method.startsWith("offline:")
    ? offlineMethods.find((m) => `offline:${m.id}` === method)
    : undefined;
  const [offlineFields, setOfflineFields] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  /** The booking stands but its transfer details did not attach — say so. */
  const [attachFailed, setAttachFailed] = useState(false);

  /** Card payment is taken in place, so this gateway skips the redirect path. */
  const payingByCard = method === "stripe";

  // Memoised: StripeCardForm prepares the payment once, and a fresh object each
  // render would look like a new request to it.
  const intentBody = useMemo(
    () => ({
      service_address_id: addressId,
      service_schedule: when ? when.replace("T", " ") + ":00" : schedule,
      zone_id: zoneId,
      ...(isRepeat ? { service_type: "repeat", dates } : {}),
    }),
    [addressId, when, schedule, zoneId, isRepeat, dates]
  );

  const totals = useMemo(() => {
    let serviceAmount = 0, profDiscount = 0, material = 0, addon = 0, discount = 0, coupon = 0, vat = 0, items = 0;
    for (const c of cart) {
      const base = num(c.service_cost) * num(c.quantity || 1) * num(c.professional_count || 1);
      serviceAmount += base - num(c.professional_discount);
      profDiscount += num(c.professional_discount);
      material += num(c.material_charge);
      addon += num(c.add_on_total);
      discount += num(c.discount_amount) + num(c.campaign_discount);
      coupon += num(c.coupon_discount);
      vat += num(c.tax_amount);  // zero now — VAT moved to the fee
      items += num(c.total_cost);
    }
    // VAT is charged on the service fee only, once per booking.
    vat += (num(serviceFee) * num(vatPercent)) / 100;

    // A cart line is priced for one visit. On a repeat booking the lines are
    // delivered once per date, so the figures above describe a single visit
    // while the total below covers them all — a subtotal smaller than the
    // total it sits above reads as an error even when the total is right.
    const visits = Math.max(1, dates.length);

    return {
      serviceAmount: serviceAmount * visits,
      profDiscount: profDiscount * visits,
      material: material * visits,
      addon: addon * visits,
      discount: discount * visits,
      coupon, vat,
      grand: serverTotal > 0 ? serverTotal : items * visits + num(serviceFee) + vat,
    };
  }, [cart, serviceFee, vatPercent, serverTotal, dates]);

  async function saveAddress() {
    if (!newLoc) return;
    setSavingAddr(true);
    setError("");
    try {
      const res = await fetch("/api/checkout/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          lat: newLoc.lat,
          lon: newLoc.lon,
          address: newLoc.formattedAddress || [newLoc.area, newLoc.city].filter(Boolean).join(", "),
          city: newLoc.city,
          street: newLoc.area,
          house: building,
          floor,
          contact_person_name: contactName,
          contact_person_number: contactNumber,
          address_label: "Home",
        }),
      });
      const data = await res.json();
      if (data.ok && data.address) {
        setAddressList((prev) => [data.address, ...prev]);
        setAddressId(data.address.id);
        setAdding(false);
      } else {
        setError(data.message || dict.failed);
      }
    } finally {
      setSavingAddr(false);
    }
  }

  async function placeOrder() {
    if (!addressId) {
      setError(dict.selectAddressFirst);
      return;
    }
    // Checked before the booking is created: a missing reference cannot be
    // supplied afterwards without leaving an unmatched booking behind.
    if (offlineChosen) {
      const missing = offlineChosen.fields.find(
        (f) => f.required && !(offlineFields[f.name] ?? "").trim()
      );
      if (missing) {
        setError(dict.offlineFieldRequired?.replace("{field}", humanise(missing.name)) ?? dict.failed);
        return;
      }
    }

    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          service_address_id: addressId,
          service_schedule: when ? when.replace("T", " ") + ":00" : schedule,
          payment_method: offlineChosen ? "offline_payment" : method,
          zone_id: zoneId,
          ...(isRepeat ? { service_type: "repeat", dates } : {}),
        }),
      });
      const data = await res.json();
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (data.ok) {
        // The booking exists now; attaching the transfer details is a second
        // call, and its failure must not read as a failed booking.
        if (offlineChosen) {
          // One cart can produce a booking per sub-category, so the backend
          // answers with a list even when there is only one.
          const ids = data.booking?.booking_id;
          const bookingId = Array.isArray(ids) ? ids[0] : ids;

          // Every declared field is sent, empty ones included: the backend
          // rejects the whole payload when a key is absent, whether or not it
          // was marked required — and that rejection would otherwise leave a
          // booking with no payment record and nobody told.
          const info: Record<string, string> = {};
          for (const f of offlineChosen.fields) info[f.name] = offlineFields[f.name] ?? "";

          const attached = await fetch("/api/checkout/offline-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locale,
              booking_id: bookingId,
              offline_payment_id: offlineChosen.id,
              customer_information: info,
            }),
          })
            .then((r) => r.json())
            .catch(() => ({ ok: false }));

          if (!attached.ok) setAttachFailed(true);
        }
        setDone(true);
      } else {
        setError(data.message || dict.failed);
      }
    } catch {
      setError(dict.failed);
    } finally {
      setPlacing(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-surface p-8 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h1 className="text-xl font-bold text-ink">{dict.success}</h1>
        {attachFailed && (
          <p className="mt-4 rounded-xl bg-surface-soft p-3 text-sm text-muted">
            {dict.offlineAttachFailed}
          </p>
        )}
        <Link
          href={`/${locale}/account/bookings`}
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white"
        >
          {dict.viewBookings}
        </Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return <p className="text-center text-muted">{dict.emptyCart}</p>;
  }

  const field = (label: string, value: string, set: (v: string) => void, type = "text") => (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-ink">{dict.title}</h1>

        {/* Address */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">{dict.address}</h2>
          {addressList.length > 0 && !adding && (
            <div className="space-y-2">
              {addressList.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                    addressId === a.id ? "border-primary bg-primary-light/30" : "border-border bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    {a.address_label && (
                      <span className="me-2 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark">
                        {a.address_label}
                      </span>
                    )}
                    <span className="text-ink">{a.address}</span>
                  </span>
                </label>
              ))}
              <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-primary">
                + {dict.addAddress}
              </button>
            </div>
          )}

          {adding && (
            <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
              <LocationPicker dict={locationDict} onResolved={(l) => setNewLoc(l)} />
              {newLoc && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {field(dict.contactName, contactName, setContactName)}
                    {field(dict.contactNumber, contactNumber, setContactNumber)}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {field(addressDict.building, building, setBuilding)}
                    {field(addressDict.floor, floor, setFloor)}
                  </div>
                  <button
                    type="button"
                    onClick={saveAddress}
                    disabled={savingAddr || !contactName || !contactNumber}
                    className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60"
                  >
                    {dict.addAddress}
                  </button>
                </>
              )}
              {addressList.length > 0 && (
                <button type="button" onClick={() => setAdding(false)} className="ms-3 text-sm text-muted">
                  {addressDict.changeNumber ?? "Cancel"}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Schedule */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">{dict.schedule}</h2>
          {isRepeat ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                {dict.repeatVisits?.replace("{n}", String(repeatDates.length)) ??
                  `${repeatDates.length} visits`}
              </p>
              <ul className="flex flex-wrap gap-2">
                {repeatDates.map((d, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border bg-surface-soft px-3 py-1.5 text-sm text-ink"
                  >
                    {d.slice(0, 16)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-primary"
            />
          )}
        </section>

        {/* Payment */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">{dict.payment}</h2>
          <div className="space-y-2">
            {cashAllowed && (
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${method === "cash_after_service" ? "border-primary bg-primary-light/30" : "border-border bg-surface"}`}>
                <input type="radio" name="pay" checked={method === "cash_after_service"} onChange={() => setMethod("cash_after_service")} />
                <span className="text-sm text-ink">💵 {dict.cashAfterService}</span>
              </label>
            )}

            {gateways.filter((g) => g.key).map((g) => {
              const selected = method === g.key;
              // Stripe collects the card here; the others still hand off to a
              // hosted page, so only Stripe opens a form in place.
              const inline = g.key === "stripe";
              return (
                <div
                  key={g.key}
                  className={`rounded-2xl border ${selected ? "border-primary bg-primary-light/30" : "border-border bg-surface"}`}
                >
                  <label className="flex cursor-pointer items-center gap-3 p-4">
                    <input type="radio" name="pay" checked={selected} onChange={() => setMethod(g.key)} />
                    <span className="text-sm text-ink">💳 {g.title}</span>
                  </label>
                  {selected && inline && addressId && (
                    <div className="border-t border-border/60 p-4">
                      <StripeCardForm
                        locale={locale}
                        dict={dict}
                        intentBody={intentBody}
                        onPaid={() => setDone(true)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {offlineMethods.map((m) => {
              const key = `offline:${m.id}`;
              const selected = method === key;
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border ${selected ? "border-primary bg-primary-light/30" : "border-border bg-surface"}`}
                >
                  <label className="flex cursor-pointer items-center gap-3 p-4">
                    <input type="radio" name="pay" checked={selected} onChange={() => setMethod(key)} />
                    <span className="text-sm text-ink">🏦 {m.name}</span>
                  </label>

                  {/* Details and the form appear only once chosen — three
                      collapsed methods read as a list, three expanded ones as a wall. */}
                  {selected && (
                    <div className="space-y-4 border-t border-border/60 p-4">
                      {m.info.length > 0 && (
                        <dl className="space-y-1 rounded-xl bg-surface-soft p-3 text-sm">
                          {m.info.map((i, idx) => (
                            <div key={idx} className="flex flex-wrap justify-between gap-2">
                              <dt className="text-muted">{i.title}</dt>
                              <dd className="font-medium text-ink">{i.data}</dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {m.fields.length > 0 && (
                        <>
                          <p className="text-sm text-muted">{dict.offlineIntro}</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {m.fields.map((f) => (
                              <div key={f.name}>
                                <label className="mb-1 block text-sm font-medium text-ink">
                                  {humanise(f.name)}
                                  {f.required && <span className="text-accent-dark"> *</span>}
                                </label>
                                <input
                                  type="text"
                                  value={offlineFields[f.name] ?? ""}
                                  onChange={(e) =>
                                    setOfflineFields((prev) => ({ ...prev, [f.name]: e.target.value }))
                                  }
                                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-primary"
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <p className="text-xs text-muted">{dict.offlineNote}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
          <h2 className="text-lg font-bold text-ink">{dict.summary}</h2>
          <Line label={dict.serviceAmount} value={money(totals.serviceAmount)} />
          {totals.profDiscount > 0 && <Line label={dict.professionalDiscount} value={`- ${money(totals.profDiscount)}`} />}
          {totals.material > 0 && <Line label={dict.material} value={`+ ${money(totals.material)}`} />}
          {totals.addon > 0 && <Line label={dict.addons} value={`+ ${money(totals.addon)}`} />}
          {totals.discount > 0 && <Line label={dict.discount} value={`- ${money(totals.discount)}`} />}
          {totals.coupon > 0 && <Line label={dict.coupon} value={`- ${money(totals.coupon)}`} />}
          {serviceFee > 0 && <Line label={dict.serviceFee} value={`+ ${money(serviceFee)}`} />}
          {totals.vat > 0 && <Line label={dict.vat} value={`+ ${money(totals.vat)}`} />}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between text-base font-bold text-ink">
              <span>{dict.total}</span>
              <span>{money(totals.grand)}</span>
            </div>
          </div>
          {error && <p className="text-sm text-accent-dark">{error}</p>}
          {/* The card form carries its own pay button — two would be two ways to
              be charged for the same booking. */}
          {payingByCard ? (
            <p className="mt-2 text-center text-sm text-muted">{dict.cardUseFormAbove}</p>
          ) : (
          <button
            type="button"
            onClick={placeOrder}
            disabled={placing || !addressId}
            className="mt-2 w-full rounded-full bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
          >
            {placing ? dict.placing : dict.placeOrder}
          </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <span>{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
