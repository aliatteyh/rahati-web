"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/lib/intl";
// Straight from the currency module, not through lib/api: that one also
// exports the server-side fetchers, which reach for next/headers and
// cannot be pulled into a client component at all.
import { formatNumber } from "@/lib/currency";
import { ReschedulePicker } from "./ReschedulePicker";
import type { BookingAddress, BookingRow, Cleaner, PlanSummary, PlanVisit } from "./types";

type Dict = Record<string, string>;

/** Anything still to come; everything else is history. */
const UPCOMING = ["pending", "accepted", "ongoing"];

export function BookingsClient({
  locale,
  dict,
  currency,
  rows,
  plans,
  bookHref,
}: {
  locale: Locale;
  dict: Dict;
  currency: string;
  rows: BookingRow[];
  /** Keyed by the plan's booking id; empty for a customer with no plans. */
  plans: Record<string, PlanSummary>;
  bookHref: string;
}) {
  const [upcoming, setUpcoming] = useState(true);
  const [open, setOpen] = useState<
    | { kind: "booking"; row: BookingRow }
    | { kind: "plan"; plan: PlanSummary; row: BookingRow }
    | { kind: "visit"; plan: PlanSummary; visit: PlanVisit; row: BookingRow }
    | null
  >(null);

  const fmt = useMemo(() => formatters(locale), [locale]);
  // Both decimals always, as every other price on the site prints them: a
  // visit costing 89.70 shown as "89.7" reads as a rounding mistake on a
  // page of receipts.
  const money = (value: number) =>
    `${currency} ${formatNumber(value, locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const visible = rows.filter((row) => UPCOMING.includes(row.status) === upcoming);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Tab label={dict.upcoming} on={upcoming} onClick={() => setUpcoming(true)} />
          <Tab label={dict.past} on={!upcoming} onClick={() => setUpcoming(false)} />
        </div>
        <Link
          href={bookHref}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {dict.bookNow}
        </Link>
      </div>

      {visible.length === 0 && <p className="text-sm text-muted">{dict.noBookings}</p>}

      <div className="space-y-8">
        {visible.map((row) => {
          const plan = row.isPlan ? plans[row.id] : undefined;

          if (plan) {
            // Only the visits that belong in the tab being read: a plan with
            // four visits behind it and eight ahead belongs in both, showing
            // different halves of itself.
            const visits = plan.visits.filter(
              (visit) => UPCOMING.includes(visit.booking_status) === upcoming
            );

            return (
              <section key={row.id} className="space-y-4">
                <PlanPanel
                  dict={dict}
                  fmt={fmt}
                  money={money}
                  plan={plan}
                  row={row}
                  onOpen={() => setOpen({ kind: "plan", plan, row })}
                />

                {visits.length > 0 && (
                  // Two across, not three. The account column is narrow, and
                  // a third card took each one down to about 230 points —
                  // enough for four lines of title and an ellipsis through
                  // the cleaner's name.
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visits.map((visit) => (
                      <VisitCard
                        key={visit.id}
                        dict={dict}
                        fmt={fmt}
                        money={money}
                        plan={plan}
                        visit={visit}
                        onOpen={() => setOpen({ kind: "visit", plan, visit, row })}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          }

          return (
            <BookingCard
              key={row.id}
              dict={dict}
              fmt={fmt}
              money={money}
              row={row}
              onOpen={() => setOpen({ kind: "booking", row })}
            />
          );
        })}
      </div>

      {open?.kind === "booking" && (
        <BookingSheet
          locale={locale}
          dict={dict}
          fmt={fmt}
          money={money}
          row={open.row}
          onClose={() => setOpen(null)}
        />
      )}

      {open?.kind === "plan" && (
        <PlanSheet
          locale={locale}
          dict={dict}
          fmt={fmt}
          money={money}
          plan={open.plan}
          row={open.row}
          onClose={() => setOpen(null)}
        />
      )}

      {open?.kind === "visit" && (
        <VisitSheet
          locale={locale}
          dict={dict}
          fmt={fmt}
          money={money}
          plan={open.plan}
          visit={open.visit}
          row={open.row}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ cards */

function PlanPanel({
  dict,
  fmt,
  money,
  plan,
  row,
  onOpen,
}: {
  dict: Dict;
  fmt: Formatters;
  money: (value: number) => string;
  plan: PlanSummary;
  row: BookingRow;
  onOpen: () => void;
}) {
  const done = plan.visits_done;
  const total = Math.max(1, plan.visits_total);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-3xl bg-primary-dark p-6 text-start text-white transition hover:opacity-95"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-white/70">
            {dict.activePlan} · #{plan.readable_id}
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {plan.service_name} · {fmt.duration(plan.duration_minutes, dict)} {dict.perVisitShort}
          </h2>
          <p className="mt-1 text-sm text-white/80">
            {fmt.frequency(plan, dict)}
          </p>
        </div>
        {plan.per_visit != null && (
          <p className="shrink-0 text-sm font-semibold">
            {money(plan.per_visit)} / {dict.visitWord}
          </p>
        )}
      </div>

      {plan.serviceman && (
        <div className="mt-4">
          <CleanerLine
            dict={dict}
            onDark
            cleaner={{
              name: plan.serviceman.name,
              image: plan.serviceman.image_full_path,
              rating: Number(plan.serviceman.avg_rating),
              ratingCount: plan.serviceman.rating_count,
              visits: plan.serviceman.visits_count,
            }}
          />
        </div>
      )}

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-white/80">
        {(dict.planProgress ?? "")
          .replace("{done}", String(done))
          .replace("{left}", String(plan.visits_left))
          .replace("{total}", String(plan.visits_total))}
      </p>
      <span className="sr-only">{row.readableId}</span>
    </button>
  );
}

function VisitCard({
  dict,
  fmt,
  money,
  plan,
  visit,
  onOpen,
}: {
  dict: Dict;
  fmt: Formatters;
  money: (value: number) => string;
  plan: PlanSummary;
  visit: PlanVisit;
  onOpen: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <button type="button" onClick={onOpen} className="block w-full text-start">
        <div className="flex items-start justify-between gap-2">
          {/* The service alone on the title line. Hung together with the
              length and "per visit", it ran to four lines in a card this
              wide and pushed the price off the fold — and the length is the
              same on every card of a plan, which makes it a detail, not a
              name. */}
          <h3 className="text-sm font-semibold leading-snug text-ink">{plan.service_name}</h3>
          <StatusChip dict={dict} status={visit.booking_status} />
        </div>
        <p className="mt-1 text-xs text-muted">
          {fmt.duration(visit.duration_minutes ?? plan.duration_minutes, dict)}{" "}
          {dict.perVisitShort}
          {visit.visit_number != null && (
            <>
              {" · "}
              {(dict.visitOf ?? "")
                .replace("{n}", String(visit.visit_number))
                .replace("{total}", String(plan.visits_total))}
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted">{fmt.dateTime(visit.service_schedule)}</p>

        {plan.serviceman && (
          <div className="mt-3 rounded-xl bg-surface-soft p-2">
            <CleanerLine
              dict={dict}
              cleaner={{
                name: plan.serviceman.name,
                image: plan.serviceman.image_full_path,
                rating: Number(plan.serviceman.avg_rating),
                ratingCount: plan.serviceman.rating_count,
                visits: plan.serviceman.visits_count,
              }}
            />
          </div>
        )}
      </button>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="font-semibold text-ink">{money(visit.amount)}</span>
        {visit.can_reschedule && (
          <button
            type="button"
            onClick={onOpen}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {dict.reschedule}
          </button>
        )}
      </div>
    </article>
  );
}

function BookingCard({
  dict,
  fmt,
  money,
  row,
  onOpen,
}: {
  dict: Dict;
  fmt: Formatters;
  money: (value: number) => string;
  row: BookingRow;
  onOpen: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 sm:max-w-[calc(50%-0.5rem)]">
      <button type="button" onClick={onOpen} className="block w-full text-start">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug text-ink">{row.serviceName}</h3>
          <StatusChip dict={dict} status={row.status} />
        </div>
        <p className="mt-1 text-xs text-muted">
          {row.durationMinutes > 0 && `${fmt.duration(row.durationMinutes, dict)} · `}
          {fmt.dateTime(row.schedule)}
        </p>

        {row.cleaner && (
          <div className="mt-3 rounded-xl bg-surface-soft p-2">
            <CleanerLine dict={dict} cleaner={row.cleaner} />
          </div>
        )}
      </button>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="font-semibold text-ink">{money(row.total)}</span>
        <button
          type="button"
          onClick={onOpen}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {dict.viewDetails}
        </button>
      </div>
    </article>
  );
}

/* ----------------------------------------------------------------- sheets */

function Sheet({
  title,
  kicker,
  status,
  dict,
  children,
  onClose,
}: {
  title: string;
  kicker: string;
  status: string;
  dict: Dict;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-3xl bg-paper p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-xs text-muted">{kicker}</p>
          <div className="flex items-center gap-2">
            <StatusChip dict={dict} status={status} />
            <button
              type="button"
              onClick={onClose}
              aria-label={dict.close}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>
        <h2 className="mt-1 text-xl font-bold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function BookingSheet({
  locale,
  dict,
  fmt,
  money,
  row,
  onClose,
}: {
  locale: Locale;
  dict: Dict;
  fmt: Formatters;
  money: (value: number) => string;
  row: BookingRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [cancelling, setCancelling] = useState<"idle" | "confirm" | "sending">("idle");
  const canAmend = UPCOMING.includes(row.status) && row.status !== "ongoing";

  async function cancel() {
    setCancelling("sending");
    await fetch("/api/booking/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: row.id, locale }),
    }).catch(() => undefined);
    router.refresh();
    onClose();
  }

  return (
    <Sheet
      dict={dict}
      kicker={`#${row.readableId}`}
      status={row.status}
      title={`${row.serviceName}${row.durationMinutes ? ` · ${fmt.duration(row.durationMinutes, dict)}` : ""}`}
      onClose={onClose}
    >
      {row.cleaner && (
        <div className="mt-4 rounded-2xl bg-surface p-4">
          <CleanerLine dict={dict} cleaner={row.cleaner} big />
          <p className="mt-1 text-sm font-medium text-primary">{dict.yourCleaner}</p>
          <Link
            href={`/${locale}/account/bookings/${row.id}/chat`}
            className="mt-3 inline-flex rounded-xl border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-light"
          >
            {dict.message}
          </Link>
        </div>
      )}

      <dl className="mt-4 rounded-2xl bg-surface p-4 text-sm">
        <Fact label={dict.when} value={fmt.dateTime(row.schedule)} />
        {row.durationMinutes > 0 && (
          <Fact label={dict.duration} value={fmt.duration(row.durationMinutes, dict)} />
        )}
        <Fact label={dict.cleanersLabel} value={fmt.cleaners(row.cleaners, dict)} />
        <Fact
          label={dict.materials}
          value={row.withMaterials ? dict.withMaterials : dict.withoutMaterials}
        />
        <Fact label={dict.address} value={fmt.address(row.address)} />
        <Money dict={dict} money={money} row={row} />
      </dl>

      {canAmend && (
        <div className="mt-4 space-y-3">
          {moving ? (
            <div className="rounded-2xl bg-surface p-4">
              <ReschedulePicker
                locale={locale}
                dict={dict}
                serviceId={row.serviceId}
                variantKey={row.variantKey}
                professionals={row.cleaners}
                withMaterials={row.withMaterials}
                bookingId={row.id}
                onDone={onClose}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMoving(true)}
              className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
            >
              {dict.reschedule}
            </button>
          )}

          {cancelling === "idle" && (
            <button
              type="button"
              onClick={() => setCancelling("confirm")}
              className="w-full rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {dict.cancelBooking}
            </button>
          )}
          {cancelling === "confirm" && (
            <div className="rounded-2xl border border-danger/40 bg-danger-soft p-4 text-sm">
              <p className="text-danger">{dict.confirmCancel}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  className="rounded-xl bg-danger px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {dict.cancelBooking}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelling("idle")}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  {dict.keep}
                </button>
              </div>
            </div>
          )}
          {cancelling === "sending" && (
            <p className="text-center text-sm text-muted">{dict.cancelling}</p>
          )}

          <p className="text-center text-xs text-muted">{dict.freeChanges}</p>
        </div>
      )}
    </Sheet>
  );
}

function PlanSheet({
  locale,
  dict,
  fmt,
  money,
  plan,
  row,
  onClose,
}: {
  locale: Locale;
  dict: Dict;
  fmt: Formatters;
  money: (value: number) => string;
  plan: PlanSummary;
  row: BookingRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "sending">("idle");

  async function cancelRemaining() {
    setState("sending");
    await fetch("/api/booking/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: plan.id, locale }),
    }).catch(() => undefined);
    router.refresh();
    onClose();
  }

  const t = plan.totals;

  return (
    <Sheet
      dict={dict}
      kicker={`#${plan.readable_id}`}
      status={plan.booking_status}
      title={`${plan.service_name} · ${fmt.duration(plan.duration_minutes, dict)} ${dict.perVisitShort}`}
      onClose={onClose}
    >
      {plan.serviceman && (
        <div className="mt-4 rounded-2xl bg-surface p-4">
          <CleanerLine
            dict={dict}
            big
            cleaner={{
              name: plan.serviceman.name,
              image: plan.serviceman.image_full_path,
              rating: Number(plan.serviceman.avg_rating),
              ratingCount: plan.serviceman.rating_count,
              visits: plan.serviceman.visits_count,
            }}
          />
          <p className="mt-1 text-sm font-medium text-primary">{dict.sameCleanerPlan}</p>
          {/* The same way out as on a single booking: a customer looking at
              one visit is the likeliest of all to have something to say about
              it, and the sheet used to offer no way to say it. The thread
              belongs to the plan, which is where the office answers. */}
          <Link
            href={`/${locale}/account/bookings/${plan.id}/chat`}
            className="mt-3 inline-flex rounded-xl border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-light"
          >
            {dict.message}
          </Link>
        </div>
      )}

      <dl className="mt-4 rounded-2xl bg-surface p-4 text-sm">
        {/* Its own label: the dictionary's "days" is the unit in "30 days",
            lowercase, and it read as a typo at the head of a column. */}
        <Fact label={dict.daysLabel} value={fmt.weekdays(plan.weekdays)} />
        <Fact label={dict.time} value={fmt.time(plan.time)} />
        <Fact
          label={dict.duration}
          value={(dict.monthsCount ?? "{n}").replace("{n}", String(plan.months))}
        />
        <Fact label={dict.visits} value={`${plan.visits_done} / ${plan.visits_total}`} />
        {plan.per_visit != null && <Fact label={dict.perVisit} value={money(plan.per_visit)} />}
        <Fact label={dict.cleanersLabel} value={fmt.cleaners(plan.cleaners_count, dict)} />
        <Fact
          label={dict.materials}
          value={plan.with_materials ? dict.withMaterials : dict.withoutMaterials}
        />
        {plan.add_ons.map((addOn) => (
          <Fact
            key={addOn.name ?? ""}
            label={addOn.name ?? ""}
            value={`${addOn.quantity} × ${money(addOn.price)}`}
          />
        ))}
        <Fact label={dict.address} value={fmt.address(plan.address)} />

        {t.service_fee > 0 && <Fact label={dict.serviceFee} value={money(t.service_fee)} />}
        {t.tax > 0 && <Fact label={dict.tax} value={money(t.tax)} />}
        {t.tip > 0 && <Fact label={dict.tip} value={money(t.tip)} />}
        {t.discount > 0 && <Fact label={dict.discount} value={`- ${money(t.discount)}`} />}
        <Fact label={dict.paymentMethod} value={fmt.payment(plan.payment_method, dict)} />

        <div className="mt-2 flex items-center justify-between border-t border-border pt-3 font-bold text-ink">
          <span>{dict.planTotal}</span>
          <span dir="auto">{money(t.plan_total)}</span>
        </div>
      </dl>

      {plan.visits_left > 0 && (
        <div className="mt-4">
          {state === "idle" && (
            <button
              type="button"
              onClick={() => setState("confirm")}
              className="w-full rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {dict.cancelRemaining}
            </button>
          )}
          {state === "confirm" && (
            <div className="rounded-2xl border border-danger/40 bg-danger-soft p-4 text-sm">
              <p className="text-danger">{dict.confirmCancel}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={cancelRemaining}
                  className="rounded-xl bg-danger px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {dict.cancelRemaining}
                </button>
                <button
                  type="button"
                  onClick={() => setState("idle")}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  {dict.keep}
                </button>
              </div>
            </div>
          )}
          {state === "sending" && <p className="text-center text-sm text-muted">{dict.cancelling}</p>}
          <p className="mt-2 text-center text-xs text-muted">{dict.onlyUpcomingCancelled}</p>
        </div>
      )}
      <span className="sr-only">{row.readableId}</span>
    </Sheet>
  );
}

function VisitSheet({
  locale,
  dict,
  fmt,
  money,
  plan,
  visit,
  row,
  onClose,
}: {
  locale: Locale;
  dict: Dict;
  fmt: Formatters;
  money: (value: number) => string;
  plan: PlanSummary;
  visit: PlanVisit;
  row: BookingRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  async function skip() {
    setSkipping(true);
    setRefused(null);

    try {
      const res = await fetch("/api/booking/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, visit_id: visit.id }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) {
        router.refresh();
        onClose();
        return;
      }

      setRefused(String(json.reason ?? "refused"));
    } catch {
      setRefused("refused");
    }

    setSkipping(false);
  }

  return (
    <Sheet
      dict={dict}
      kicker={`#${plan.readable_id} · ${
        visit.visit_number != null ? `#${visit.visit_number}` : visit.readable_id
      }`}
      status={visit.booking_status}
      title={`${plan.service_name} · ${fmt.duration(
        visit.duration_minutes ?? plan.duration_minutes,
        dict
      )} ${dict.perVisitShort}`}
      onClose={onClose}
    >
      {plan.serviceman && (
        <div className="mt-4 rounded-2xl bg-surface p-4">
          <CleanerLine
            dict={dict}
            big
            cleaner={{
              name: plan.serviceman.name,
              image: plan.serviceman.image_full_path,
              rating: Number(plan.serviceman.avg_rating),
              ratingCount: plan.serviceman.rating_count,
              visits: plan.serviceman.visits_count,
            }}
          />
          <p className="mt-1 text-sm font-medium text-primary">{dict.sameCleanerPlan}</p>
          {/* The same way out as on a single booking: a customer looking at
              one visit is the likeliest of all to have something to say about
              it, and the sheet used to offer no way to say it. The thread
              belongs to the plan, which is where the office answers. */}
          <Link
            href={`/${locale}/account/bookings/${plan.id}/chat`}
            className="mt-3 inline-flex rounded-xl border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-light"
          >
            {dict.message}
          </Link>
        </div>
      )}

      <dl className="mt-4 rounded-2xl bg-surface p-4 text-sm">
        <Fact label={dict.when} value={fmt.dateTime(visit.service_schedule)} />
        <Fact
          label={dict.duration}
          value={fmt.duration(visit.duration_minutes ?? plan.duration_minutes, dict)}
        />
        <Fact label={dict.cleanersLabel} value={fmt.cleaners(plan.cleaners_count, dict)} />
        <Fact
          label={dict.materials}
          value={plan.with_materials ? dict.withMaterials : dict.withoutMaterials}
        />
        <Fact label={dict.address} value={fmt.address(plan.address)} />
        <div className="mt-2 flex items-center justify-between border-t border-border pt-3 font-bold text-ink">
          <span>{dict.visitPrice}</span>
          <span dir="auto">{money(visit.amount)}</span>
        </div>
      </dl>

      {(visit.can_reschedule || visit.can_skip) && (
        <div className="mt-4 space-y-3">
          {moving ? (
            <div className="rounded-2xl bg-surface p-4">
              <ReschedulePicker
                locale={locale}
                dict={dict}
                serviceId={row.serviceId}
                variantKey={row.variantKey}
                professionals={plan.cleaners_count}
                withMaterials={plan.with_materials}
                visitId={visit.id}
                onDone={onClose}
              />
            </div>
          ) : (
            visit.can_reschedule && (
              <button
                type="button"
                onClick={() => setMoving(true)}
                className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
              >
                {dict.reschedule}
              </button>
            )
          )}

          {visit.can_skip && !moving && (
            <button
              type="button"
              disabled={skipping}
              onClick={skip}
              className="w-full rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger disabled:opacity-60"
            >
              {skipping ? dict.skipping : dict.skipVisit}
            </button>
          )}

          {refused && (
            <p className="rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
              {dict[`refused_${refused}`] ?? dict.skipFailed}
            </p>
          )}

          <p className="text-center text-xs text-muted">
            {(dict.changesThisVisit ?? "").replace("{hours}", String(visit.skip_notice_hours))}
          </p>
        </div>
      )}
    </Sheet>
  );
}

/* ----------------------------------------------------------------- pieces */

function Tab({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
        on ? "bg-ink text-white" : "border border-border bg-surface text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function StatusChip({ dict, status }: { dict: Dict; status: string }) {
  const tone =
    status === "canceled" || status === "cancelled"
      ? "bg-danger-soft text-danger"
      : status === "pending"
        ? "bg-sand text-sand-ink"
        : status === "completed"
          ? "bg-surface-soft text-muted"
          : "bg-primary-light text-primary-dark";

  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}
    >
      {dict[`status_${status}`] ?? status}
    </span>
  );
}

function CleanerLine({
  dict,
  cleaner,
  big,
  onDark,
}: {
  dict: Dict;
  cleaner: Cleaner;
  big?: boolean;
  onDark?: boolean;
}) {
  const size = big ? 48 : 32;
  // No reviews and no visits yet is not a bad score: a cleaner who started
  // this week has nothing to show, and "0.0" reads as the worst rating there
  // is rather than as the absence of one.
  const fresh = cleaner.ratingCount === 0 && cleaner.visits === 0;
  // Each figure only when there is one: a cleaner with a rating and no
  // finished visits yet should not advertise "0 visits" beside it.
  const credits = [
    cleaner.ratingCount > 0 ? `★ ${cleaner.rating.toFixed(1)}` : null,
    cleaner.visits > 0
      ? (dict.visitsCount ?? "{n}").replace("{n}", String(cleaner.visits))
      : null,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-3">
      <span
        className="relative shrink-0 overflow-hidden rounded-full bg-surface-soft"
        style={{ width: size, height: size }}
      >
        {cleaner.image ? (
          // A plain img, like every other remote picture on the site: the
          // photographs come from whichever panel host this build points at,
          // and next/image refuses a host it was not told about at build time.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cleaner.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs text-muted">
            ★
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate font-semibold ${onDark ? "text-white" : "text-ink"} ${
            big ? "text-base" : "text-sm"
          }`}
        >
          {cleaner.name}
        </span>
        <span className={`block text-xs ${onDark ? "text-white/75" : "text-muted"}`}>
          {fresh || credits.length === 0 ? dict.cleanerNew : credits.join(" · ")}
        </span>
      </span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="text-muted">{label}</dt>
      {/* dir="auto" so a figure keeps its own direction inside an Arabic
          page: "- AED 303.60" was rendering with the minus sign trailing the
          number, which reads as a footnote mark rather than a deduction. */}
      <dd dir="auto" className="text-end font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}

/** The money on a single booking, in the order a receipt reads. */
function Money({
  dict,
  money,
  row,
}: {
  dict: Dict;
  money: (value: number) => string;
  row: BookingRow;
}) {
  return (
    <>
      <Fact label={dict.subtotal} value={money(row.subtotal)} />
      {row.addOnTotal > 0 && <Fact label={dict.addOns} value={money(row.addOnTotal)} />}
      {row.fee > 0 && <Fact label={dict.serviceFee} value={money(row.fee)} />}
      {row.tip > 0 && <Fact label={dict.tip} value={money(row.tip)} />}
      {row.tax > 0 && <Fact label={dict.tax} value={money(row.tax)} />}
      {row.discount > 0 && <Fact label={dict.discount} value={`- ${money(row.discount)}`} />}
      <Fact label={dict.paymentMethod} value={dict[`pay_${row.paymentMethod}`] ?? dict.paymentMethod} />
      <div className="mt-2 flex items-center justify-between border-t border-border pt-3 font-bold text-ink">
        <span>{dict.total}</span>
        <span dir="auto">{money(row.total)}</span>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- formatting */

interface Formatters {
  dateTime: (value: string | null) => string;
  time: (value: string | null) => string;
  duration: (minutes: number | null, dict: Dict) => string;
  cleaners: (count: number, dict: Dict) => string;
  weekdays: (isoDays: number[]) => string;
  address: (address: BookingAddress | null) => string;
  frequency: (plan: PlanSummary, dict: Dict) => string;
  payment: (method: string, dict: Dict) => string;
}

function formatters(locale: Locale): Formatters {
  const tag = intlLocale(locale);
  // The day and the hour are formatted apart and joined, because one
  // formatter puts a comma between them and the comma then has to be picked
  // out of the string by hand — which worked in English and left "Tue · Oct
  // 20, 10:00 AM" when it did not.
  const dayPart = new Intl.DateTimeFormat(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const clock = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" });
  const weekday = new Intl.DateTimeFormat(tag, { weekday: "short" });

  // A Monday, so an ISO weekday can be turned into its name without a table
  // of names in two languages that would then have to be kept in step.
  const MONDAY = new Date("2024-01-01T00:00:00");

  return {
    dateTime: (value) => {
      if (!value) return "";
      const date = new Date(value.replace(" ", "T"));
      if (Number.isNaN(date.getTime())) return "";
      return `${dayPart.format(date)} · ${clock.format(date)}`;
    },
    time: (value) => {
      if (!value) return "";
      const date = new Date(`2024-01-01T${value}`);
      return Number.isNaN(date.getTime()) ? value : clock.format(date);
    },
    duration: (minutes, dict) => {
      const total = Number(minutes ?? 0);
      if (total <= 0) return "";
      const hours = total / 60;
      const whole = Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 10) / 10);
      const word =
        hours === 1
          ? dict.hourWord
          : hours === 2
            ? dict.hoursTwo
            : hours <= 10
              ? dict.hoursFew
              : dict.hoursMany;
      return `${whole} ${word ?? ""}`.trim();
    },
    cleaners: (count, dict) =>
      ((count === 1 ? dict.cleanerOne : dict.cleanersMany) ?? "{n}").replace("{n}", String(count)),
    weekdays: (isoDays) =>
      isoDays
        .map((day) => {
          const date = new Date(MONDAY);
          date.setDate(MONDAY.getDate() + (day - 1));
          return weekday.format(date);
        })
        .join(" · "),
    address: (address) => {
      if (!address) return "";
      const parts = [address.building, address.apartment, address.floor, address.city]
        .map((part) => (part ?? "").toString().trim())
        .filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : (address.address ?? "");
    },
    frequency: (plan, dict) => {
      const days = (dict.timesAWeek ?? "{n}").replace("{n}", String(plan.days_per_week));
      const names = plan.weekdays
        .map((day) => {
          const date = new Date(MONDAY);
          date.setDate(MONDAY.getDate() + (day - 1));
          return weekday.format(date);
        })
        .join(" · ");
      const at = plan.time ? new Date(`2024-01-01T${plan.time}`) : null;
      return [days, names, at ? clock.format(at) : null].filter(Boolean).join(" · ");
    },
    payment: (method, dict) => dict[`pay_${method}`] ?? method,
  };
}
