"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { LocationPicker, type ResolvedLocation } from "@/components/location/LocationPicker";

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
  serviceFee,
  serverTotal,
  zoneId,
  schedule,
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
  serviceFee: number;
  serverTotal: number;
  zoneId: string;
  schedule: string;
  instructions: string;
}) {
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
  const [method, setMethod] = useState<string>("cash_after_service");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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
      vat += num(c.tax_amount);
      items += num(c.total_cost);
    }
    return {
      serviceAmount, profDiscount, material, addon, discount, coupon, vat,
      grand: serverTotal > 0 ? serverTotal : items + num(serviceFee),
    };
  }, [cart, serviceFee, serverTotal]);

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
          payment_method: method,
          zone_id: zoneId,
        }),
      });
      const data = await res.json();
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (data.ok) {
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
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-primary"
          />
        </section>

        {/* Payment */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">{dict.payment}</h2>
          <div className="space-y-2">
            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${method === "cash_after_service" ? "border-primary bg-primary-light/30" : "border-border bg-surface"}`}>
              <input type="radio" name="pay" checked={method === "cash_after_service"} onChange={() => setMethod("cash_after_service")} />
              <span className="text-sm text-ink">💵 {dict.cashAfterService}</span>
            </label>
            {gateways.filter((g) => g.key).map((g) => (
              <label key={g.key} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${method === g.key ? "border-primary bg-primary-light/30" : "border-border bg-surface"}`}>
                <input type="radio" name="pay" checked={method === g.key} onChange={() => setMethod(g.key)} />
                <span className="text-sm text-ink">💳 {g.title}</span>
              </label>
            ))}
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
          {totals.vat > 0 && <Line label={dict.vat} value={`+ ${money(totals.vat)}`} />}
          {serviceFee > 0 && <Line label={dict.serviceFee} value={`+ ${money(serviceFee)}`} />}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between text-base font-bold text-ink">
              <span>{dict.total}</span>
              <span>{money(totals.grand)}</span>
            </div>
          </div>
          {error && <p className="text-sm text-accent-dark">{error}</p>}
          <button
            type="button"
            onClick={placeOrder}
            disabled={placing || !addressId}
            className="mt-2 w-full rounded-full bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
          >
            {placing ? dict.placing : dict.placeOrder}
          </button>
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
