"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/lib/intl";

type Dict = Record<string, string>;

interface Day {
  date: string;
  slots: string[];
}

/**
 * Picks a new time for a booking, or for one visit of a plan.
 *
 * The days and the times come from the same endpoint the booking screen uses,
 * so a customer is never offered an hour the team cannot work — and the server
 * checks again when the move is submitted, because a time that was free when
 * the list was drawn may not be free when the button is pressed.
 *
 * A refusal is a key, not a sentence: the reason is written here in the
 * reader's own language rather than passed through from the server, which
 * speaks neither.
 */
export function ReschedulePicker({
  locale,
  dict,
  serviceId,
  variantKey,
  professionals,
  withMaterials,
  bookingId,
  visitId,
  onDone,
}: {
  locale: Locale;
  dict: Dict;
  serviceId: string;
  variantKey: string;
  professionals: number;
  withMaterials: boolean;
  /** One of the two: a single booking, or a visit inside a plan. */
  bookingId?: string;
  visitId?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [days, setDays] = useState<Day[] | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/booking/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            serviceId,
            variantKey,
            professionalCount: professionals,
            needMaterials: withMaterials,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setDays(Array.isArray(json.days) ? json.days : []);
      } catch {
        if (!cancelled) setDays([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locale, serviceId, variantKey, professionals, withMaterials]);

  const dayFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale(locale), {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    [locale]
  );
  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocale(locale), { hour: "numeric", minute: "2-digit" }),
    [locale]
  );

  async function submit() {
    if (!slot) return;
    setState("sending");
    setRefused(null);

    try {
      const res = await fetch("/api/booking/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          booking_id: bookingId,
          visit_id: visitId,
          service_schedule: `${days?.[dayIndex]?.date} ${slot}`,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) {
        router.refresh();
        onDone();
        return;
      }

      setRefused(String(json.reason ?? "refused"));
    } catch {
      setRefused("refused");
    }

    setState("idle");
  }

  if (days === null) {
    return <p className="py-6 text-center text-sm text-muted">{dict.loadingTimes}</p>;
  }

  if (days.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{dict.noTimes}</p>;
  }

  const slots = days[dayIndex]?.slots ?? [];

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{dict.pickNewTime}</p>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((day, i) => (
          <button
            key={day.date}
            type="button"
            onClick={() => {
              setDayIndex(i);
              setSlot(null);
            }}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              i === dayIndex
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-border text-muted hover:border-primary"
            }`}
          >
            {dayFormat.format(new Date(`${day.date}T00:00:00`))}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => setSlot(time)}
            className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
              slot === time
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-border text-ink hover:border-primary"
            }`}
          >
            {timeFormat.format(new Date(`${days[dayIndex].date}T${time}`))}
          </button>
        ))}
        {slots.length === 0 && (
          <p className="col-span-full py-2 text-sm text-muted">{dict.noTimesThatDay}</p>
        )}
      </div>

      {refused && (
        <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
          {dict[`refused_${refused}`] ?? dict.rescheduleFailed}
        </p>
      )}

      <button
        type="button"
        disabled={!slot || state === "sending"}
        onClick={submit}
        className="mt-4 w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
      >
        {state === "sending" ? dict.rescheduling : dict.confirmNewTime}
      </button>
    </div>
  );
}
