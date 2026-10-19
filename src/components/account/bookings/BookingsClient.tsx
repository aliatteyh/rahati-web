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
import { ReviewForm } from "@/components/account/ReviewForm";
import { ReschedulePicker } from "./ReschedulePicker";
import type { BookingAddress, BookingRow, Cleaner, PlanSummary, PlanVisit } from "./types";

type Dict = Record<string, string>;

/** Anything still to come; everything else is history. */
const UPCOMING = ["pending", "accepted", "ongoing"];

/**
 * The five questions a customer asks of this page — not the backend's six
 * statuses, which are a vocabulary for the office.
 */
const TABS = ["upcoming", "subscription", "pending", "cancelled", "past"] as const;
type TabKey = (typeof TABS)[number];

const isCancelled = (status: string) =>
  status === "canceled" || status === "cancelled";

/**
 * Placed, but the money has not arrived. Paying by transfer leaves a booking
 * in hand with nothing taken, and it had no place of its own on this page.
 */
const awaitingPayment = (row: BookingRow) =>
  row.paymentMethod === "offline_payment" && !row.isPaid && !isCancelled(row.status);

/** The day a row belongs under, as midnight local time. */
function dayOf(schedule: string | null): number | null {
  if (!schedule) return null;

  const at = new Date(schedule.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return null;

  return new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
}

/** Exactly one tab per booking, so nothing is listed twice or lost between. */
function tabFor(row: BookingRow): TabKey {
  if (isCancelled(row.status)) return "cancelled";
  if (awaitingPayment(row)) return "pending";
  if (row.isPlan) return "subscription";

  // The status decides, and the date only says whether it is still today.
  //
  // Reading the date first put a finished booking dated next week under
  // "upcoming": the office marked one completed from the panel and the screen
  // went on saying somebody was coming on Wednesday.
  if (UPCOMING.includes(row.status)) return "upcoming";

  const day = dayOf(row.schedule);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Today's finished visit stays where the customer last looked for it.
  return day === today ? "upcoming" : "past";
}

/**
 * The tax invoice, as the panel issues it.
 *
 * Not a receipt drawn here: there is one invoice document, built from
 * InvoiceDocument and laid out in one partial, and it is the one the app
 * opens and the office prints. A second version on the website would be a
 * second answer to "what was I charged", and the two would drift.
 *
 * Three addresses because a plan is three different documents: the whole
 * subscription, one visit of it, and a booking that is neither.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

function invoiceHref(
  kind: "customer-invoice" | "customer-fullbooking-invoice" | "customer-fullbooking-single-invoice",
  id: string,
  locale: Locale
): string {
  return `${API_BASE}/admin/booking/${kind}/${encodeURIComponent(id)}/${locale}`;
}

/** Opens in its own tab, because an invoice is a thing people print. */
function InvoiceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-primary"
    >
      {label}
    </a>
  );
}

export function BookingsClient({
  locale,
  dict,
  currency,
  rows,
  plans,
  bookHref,
  cancelNoticeHours,
  rescheduleNoticeHours,
}: {
  locale: Locale;
  dict: Dict;
  currency: string;
  rows: BookingRow[];
  /** Keyed by the plan's booking id; empty for a customer with no plans. */
  plans: Record<string, PlanSummary>;
  bookHref: string;
  /** The office's notice window for calling a visit off, from settings. */
  cancelNoticeHours: number;
  /** And the one for moving it, which the single-booking sheet never read. */
  rescheduleNoticeHours: number;
}) {
  const [tab, setTab] = useState<TabKey>("upcoming");
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

  const visible = rows.filter((row) => tabFor(row) === tab);

  // The cancelled tab is not a list of bookings: a plan is called off visit by
  // visit, so what belongs here is the visits, each carrying its plan's name.
  const cancelledVisits =
    tab === "cancelled"
      ? rows.flatMap((row) => {
          const plan = row.isPlan ? plans[row.id] : undefined;
          if (!plan) return [];

          return plan.visits
            .filter((visit) => isCancelled(visit.booking_status))
            .map((visit) => ({ plan, visit, row }));
        })
      : [];

  /** "Today", "Tomorrow", or the date — the way someone reads a diary. */
  const dayLabel = (day: number) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const difference = Math.round((day - today) / 86_400_000);

    if (difference === 0) return dict.today;
    if (difference === 1) return dict.tomorrow;
    if (difference === -1) return dict.yesterday;

    return fmt.day(new Date(day));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Five of them do not fit across a phone, so the row scrolls
            rather than wrapping into a block of chips. */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((key) => (
            <Tab
              key={key}
              label={dict[`tab_${key}`] ?? key}
              on={tab === key}
              onClick={() => setTab(key)}
            />
          ))}
        </div>
        <Link
          href={bookHref}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {dict.bookNow}
        </Link>
      </div>

      {visible.length === 0 && cancelledVisits.length === 0 && (
        <p className="text-sm text-muted">{dict[`empty_${tab}`] ?? dict.noBookings}</p>
      )}

      {/* The cancelled tab reads as a diary, newest first: a cancellation is
          something that happened, not something that is coming. */}
      {tab === "cancelled" ? (
        <div className="space-y-8">
          {groupByDay(
            [
              ...visible.map((row) => ({
                day: dayOf(row.schedule),
                key: row.id,
                node: (
                  <BookingCard
                    dict={dict}
                    fmt={fmt}
                    money={money}
                    row={row}
                    onOpen={() => setOpen({ kind: "booking", row })}
                  />
                ),
              })),
              ...cancelledVisits.map(({ plan, visit, row }) => ({
                day: dayOf(visit.service_schedule),
                key: visit.id,
                node: (
                  <VisitCard
                    dict={dict}
                    fmt={fmt}
                    money={money}
                    plan={plan}
                    visit={visit}
                    onOpen={() => setOpen({ kind: "visit", plan, visit, row })}
                  />
                ),
              })),
            ],
            "desc"
          ).map(([day, entries]) => (
            <section key={day ?? "undated"} className="space-y-4">
              {day !== null && (
                <h2 className="text-sm font-semibold text-ink">{dayLabel(day)}</h2>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {entries.map((entry) => (
                  <div key={entry.key}>{entry.node}</div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : tab === "upcoming" ? (
        <div className="space-y-8">
          {groupByDay(
            visible.map((row) => ({
              day: dayOf(row.schedule),
              key: row.id,
              node: (
                <BookingCard
                  dict={dict}
                  fmt={fmt}
                  money={money}
                  row={row}
                  onOpen={() => setOpen({ kind: "booking", row })}
                />
              ),
            })),
            "asc"
          ).map(([day, entries]) => (
            <section key={day ?? "undated"} className="space-y-4">
              {day !== null && (
                <h2 className="text-sm font-semibold text-ink">{dayLabel(day)}</h2>
              )}
              {entries.map((entry) => (
                <div key={entry.key}>{entry.node}</div>
              ))}
            </section>
          ))}
        </div>
      ) : (
      <div className="space-y-8">
        {visible.map((row) => {
          const plan = row.isPlan ? plans[row.id] : undefined;

          if (plan) {
            // The whole plan, in order. It has a tab to itself now, so there
            // is no half to choose — a finished visit vanishing from view is
            // what sent Ali looking for visit one of twelve. The called-off
            // ones are read in the cancelled tab, beside the reason.
            const visits = plan.visits.filter(
              (visit) => !isCancelled(visit.booking_status)
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
      )}

      {open?.kind === "booking" && (
        <BookingSheet
          locale={locale}
          dict={dict}
          fmt={fmt}
          money={money}
          row={open.row}
          cancelNoticeHours={cancelNoticeHours}
          rescheduleNoticeHours={rescheduleNoticeHours}
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
          cancelNoticeHours={cancelNoticeHours}
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
          <StatusChip
            dict={dict}
            status={visit.booking_status}
            cancelledBy={visit.cancelled_by}
          />
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
          <StatusChip dict={dict} status={row.status} cancelledBy={row.cancelledBy} />
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
  cancelledBy,
  dict,
  children,
  onClose,
}: {
  title: string;
  kicker: string;
  status: string;
  cancelledBy?: string | null;
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
            <StatusChip dict={dict} status={status} cancelledBy={cancelledBy} />
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
  cancelNoticeHours,
  rescheduleNoticeHours,
  onClose,
}: {
  locale: Locale;
  dict: Dict;
  fmt: Formatters;
  money: (value: number) => string;
  row: BookingRow;
  cancelNoticeHours: number;
  rescheduleNoticeHours: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [cancelling, setCancelling] = useState<"idle" | "confirm" | "sending">("idle");
  const [refusal, setRefusal] = useState<string | null>(null);
  const canAmend = UPCOMING.includes(row.status) && row.status !== "ongoing";
  const canCancel = canAmend && hasNotice(row.schedule, cancelNoticeHours);
  const canReschedule = canAmend && hasNotice(row.schedule, rescheduleNoticeHours);

  async function cancel() {
    setCancelling("sending");
    setRefusal(null);

    // The answer is read, not assumed. This used to fire the request and
    // refresh regardless, so a refused cancellation closed the sheet without
    // a word and the booking was still there when the page came back.
    const outcome = await fetch("/api/booking/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: row.id, locale }),
    })
      .then((response) => response.json())
      .catch(() => null);

    if (outcome?.ok) {
      router.refresh();
      onClose();
      return;
    }

    setCancelling("idle");
    setRefusal(refusalText(dict, outcome?.reason, cancelNoticeHours));
  }

  return (
    <Sheet
      dict={dict}
      kicker={`#${row.readableId}`}
      status={row.status}
      cancelledBy={row.cancelledBy}
      title={`${row.serviceName}${row.durationMinutes ? ` · ${fmt.duration(row.durationMinutes, dict)}` : ""}`}
      onClose={onClose}
    >
      {/* Above the fold, deliberately. Under the total it sat off the bottom
          of the sheet, and this is the one line about money a customer reads
          before somebody knocks. */}
      <PaymentNote
        dict={dict}
        method={row.paymentMethod}
        isPaid={row.isPaid}
        amount={money(row.total)}
      />

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

      <div className="mt-4 flex flex-wrap gap-2">
        <InvoiceLink href={invoiceHref("customer-invoice", row.id, locale)} label={dict.invoice} />
      </div>

      {/* Rating lived on the page this sheet replaced. A booking that is
          over is the one a customer has something to say about, and leaving
          the form behind would have quietly removed the only way to say it
          from the website. */}
      {row.status === "completed" && row.serviceId && (
        <div className="mt-3">
          <ReviewForm
            bookingId={row.id}
            serviceId={row.serviceId}
            locale={locale}
            dict={{
              rate: dict.rate,
              submitReview: dict.submitReview,
              reviewPlaceholder: dict.reviewPlaceholder,
              reviewError: dict.reviewError,
              processing: dict.processing,
              cancel: dict.cancel,
              reviewThanks: dict.reviewThanks,
            }}
          />
        </div>
      )}

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
          ) : canReschedule ? (
            <button
              type="button"
              onClick={() => setMoving(true)}
              className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
            >
              {dict.reschedule}
            </button>
          ) : (
            // The same window the server enforces. Without this the button
            // was offered on a booking two hours away, the picker loaded a
            // full calendar, and only after the customer had chosen a time
            // did anyone say it was too late to move it.
            <p className="text-center text-xs text-muted">
              {fillHours(dict.refused_inside_reschedule_window, rescheduleNoticeHours)}
            </p>
          )}

          {cancelling === "idle" && canCancel && (
            <button
              type="button"
              onClick={() => setCancelling("confirm")}
              className="w-full rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {dict.cancelBooking}
            </button>
          )}
          {cancelling === "idle" && !canCancel && (
            // Once the window has passed there is nothing to press. A button
            // whose only possible answer is a refusal is worse than none.
            <p className="text-center text-xs text-muted">
              {fillHours(dict.cancelWindowPassed, cancelNoticeHours)}
            </p>
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

          {refusal && (
            <p className="rounded-2xl bg-danger-soft px-4 py-3 text-center text-sm text-danger">
              {refusal}
            </p>
          )}

          {/* Only while cancelling is still possible. Printed under the
              refusal it contradicted it: "you can no longer cancel" with
              "cancelling is free up to 24 hours before" beneath. */}
          {canCancel && (
            <p className="text-center text-xs text-muted">
              {fillHours(dict.freeCancellation, cancelNoticeHours)}
            </p>
          )}
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
  cancelNoticeHours,
  onClose,
}: {
  locale: Locale;
  dict: Dict;
  fmt: Formatters;
  money: (value: number) => string;
  plan: PlanSummary;
  row: BookingRow;
  cancelNoticeHours: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "sending">("idle");
  const [refusal, setRefusal] = useState<string | null>(null);

  async function cancelRemaining() {
    setState("sending");
    setRefusal(null);

    const outcome = await fetch("/api/booking/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: plan.id, locale }),
    })
      .then((response) => response.json())
      .catch(() => null);

    if (outcome?.ok) {
      router.refresh();
      onClose();
      return;
    }

    setState("idle");
    setRefusal(refusalText(dict, outcome?.reason, cancelNoticeHours));
  }

  const t = plan.totals;

  return (
    <Sheet
      dict={dict}
      kicker={`#${plan.readable_id}`}
      status={plan.booking_status}
      cancelledBy={plan.cancelled_by}
      title={`${plan.service_name} · ${fmt.duration(plan.duration_minutes, dict)} ${dict.perVisitShort}`}
      onClose={onClose}
    >
      <PaymentNote
        dict={dict}
        method={plan.payment_method}
        isPaid={Number(plan.is_paid) === 1}
        amount={money(plan.totals.plan_total)}
      />

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
        {/* Named, not priced again: what they cost is already inside the
            service amount below. */}
        {plan.add_ons.length > 0 && (
          <Fact
            label={dict.addOns}
            value={plan.add_ons
              .map((addOn) => `${addOn.quantity} × ${addOn.name ?? ""}`)
              .join(" · ")}
          />
        )}
        <Fact label={dict.address} value={fmt.address(plan.address)} />

        <Fact label={dict.subtotal} value={money(t.service_amount)} />
        {t.discount > 0 && <Fact label={dict.discount} value={`- ${money(t.discount)}`} />}
        {t.service_fee > 0 && <Fact label={dict.serviceFee} value={money(t.service_fee)} />}
        {t.tip > 0 && <Fact label={dict.tip} value={money(t.tip)} />}
        {t.tax > 0 && <Fact label={dict.tax} value={money(t.tax)} />}
        <Fact label={dict.paymentMethod} value={fmt.payment(plan.payment_method, dict)} />

        <div className="mt-2 flex items-center justify-between border-t border-border pt-3 font-bold text-ink">
          <span>{dict.planTotal}</span>
          <span dir="auto">{money(t.plan_total)}</span>
        </div>
      </dl>


      <div className="mt-4 flex flex-wrap gap-2">
        <InvoiceLink
          href={invoiceHref("customer-fullbooking-invoice", plan.id, locale)}
          label={dict.invoice}
        />
      </div>

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
          {refusal && (
            <p className="mt-2 rounded-2xl bg-danger-soft px-4 py-3 text-center text-sm text-danger">
              {refusal}
            </p>
          )}
          <p className="mt-2 text-center text-xs text-muted">
            {fillHours(dict.onlyUpcomingCancelled, cancelNoticeHours)}
          </p>
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
      cancelledBy={visit.cancelled_by}
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

      <div className="mt-4 flex flex-wrap gap-2">
        <InvoiceLink
          href={invoiceHref("customer-fullbooking-single-invoice", visit.id, locale)}
          label={dict.invoice}
        />
      </div>

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

function StatusChip({
  dict,
  status,
  cancelledBy,
}: {
  dict: Dict;
  status: string;
  /** Who called it off, when it was called off at all. */
  cancelledBy?: string | null;
}) {
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
      {/* A bare "cancelled" leaves the customer to work out whether they
          did it themselves — which is the only question they have. */}
      {(status === "canceled" || status === "cancelled") && cancelledBy
        ? dict[`cancelled_by_${cancelledBy}`] ?? dict.status_canceled
        : dict[`status_${status}`] ?? status}
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
      {/* The column adds up to the total under it: the service before any
          discount, then what was taken off, then what was charged on top.
          Add-ons and materials are inside the service amount, and listing
          them again put a receipt on screen that did not reach its own
          total — 86.25 + 25 + 6 + 15 + 0.30 − 28.75 against a total of
          107.55. */}
      <Fact label={dict.subtotal} value={money(row.subtotal + row.discount)} />
      {row.discount > 0 && <Fact label={dict.discount} value={`- ${money(row.discount)}`} />}
      {row.fee > 0 && <Fact label={dict.serviceFee} value={money(row.fee)} />}
      {row.tip > 0 && <Fact label={dict.tip} value={money(row.tip)} />}
      {row.tax > 0 && <Fact label={dict.tax} value={money(row.tax)} />}
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
  /** A date on its own, for the headings a diary is read under. */
  day: (date: Date) => string;
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
    day: (date) => dayPart.format(date),
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

/* ----------------------------------------------------------- cancelling */

/** Whether a visit is still far enough away for the office to accept a cancellation. */
function hasNotice(schedule: string | null, hours: number): boolean {
  if (!schedule) return false;

  const at = new Date(schedule.replace(' ', 'T'));

  if (Number.isNaN(at.getTime())) return false;

  return at.getTime() - Date.now() > hours * 3600_000;
}

/** A refusal key from the server, said in the reader's language. */
function refusalText(dict: Dict, reason: unknown, hours: number): string {
  switch (reason) {
    case 'inside_cancel_window':
      return fillHours(dict.cancelWindowPassed, hours);
    case 'nothing_left_to_cancel':
      return dict.nothingLeftToCancel;
    case 'visit_already_started_or_closed':
      return dict.visitAlreadyUnderWay;
    default:
      return dict.somethingWentWrong;
  }
}

/** The one placeholder these sentences carry. */
function fillHours(text: string, hours: number): string {
  return (text ?? '').replace('{hours}', String(hours));
}

/* ------------------------------------------------------------- the diary */

/**
 * Rows under the day they happen on, in order.
 *
 * Undated rows keep their place at the end rather than being dropped: a
 * booking with no schedule is a fault worth seeing, not one to hide.
 */
function groupByDay<T extends { day: number | null }>(
  entries: T[],
  direction: "asc" | "desc"
): [number | null, T[]][] {
  const groups = new Map<number | null, T[]>();

  for (const entry of entries) {
    const list = groups.get(entry.day);
    if (list) list.push(entry);
    else groups.set(entry.day, [entry]);
  }

  return [...groups.entries()].sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return direction === "asc" ? a - b : b - a;
  });
}

/* --------------------------------------------------------------- the money */

/**
 * What the customer should expect to happen about the money.
 *
 * The payment method answers "how" — wallet, card, cash — which is not the
 * question anyone has when a cleaner is at the door. "Prepaid" and "have the
 * amount ready" are, and they were nowhere on the sheet: the customer had to
 * read "Cash After Service" and work it out.
 */
function paymentState(
  dict: Dict,
  method: string,
  isPaid: boolean
): { label: string; collect: boolean } {
  if (isPaid) return { label: dict.prepaid, collect: false };

  if (method === "offline_payment") {
    return { label: dict.transferNotReceived, collect: true };
  }

  return { label: dict.paymentToCollect, collect: true };
}

function PaymentNote({
  dict,
  method,
  isPaid,
  amount,
}: {
  dict: Dict;
  method: string;
  isPaid: boolean;
  amount: string;
}) {
  const state = paymentState(dict, method, isPaid);

  return (
    <div
      className={`mt-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
        state.collect ? "bg-sand text-sand-ink" : "bg-primary-light text-primary-dark"
      }`}
    >
      <span>{state.label}</span>
      {state.collect && <span dir="auto">{amount}</span>}
    </div>
  );
}
