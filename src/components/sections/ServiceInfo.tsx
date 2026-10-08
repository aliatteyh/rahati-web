import Link from "next/link";

/**
 * What a visit actually involves, under the booking form (handoff §4).
 *
 * Every block here is the panel's own content — the same four lists the
 * customer app reads from `booking_setup`, so the website and the phone
 * cannot say different things about what the cleaner brings or what the
 * customer needs ready. A list the office has not filled in draws nothing
 * rather than an empty card.
 *
 * The schedule is stored as shares of a visit, not as minutes, which is how
 * one list serves a two-hour visit and an eight-hour one. The minutes printed
 * here are those shares against the shortest visit this service sells, and the
 * line under the heading says so.
 */
export type InfoRow = { label: string; value?: string | null };

export function ServiceInfo({
  subscription,
  trust,
  schedule,
  materials,
  needs,
}: {
  subscription?: {
    title: string;
    note: string;
    cta: string;
    href: string;
  } | null;
  trust?: { title: string; points: string[]; image?: string | null } | null;
  schedule?: { title: string; note: string; rows: InfoRow[] } | null;
  materials?: { title: string; note: string; items: { label: string; image?: string | null }[] } | null;
  needs?: { title: string; items: string[] } | null;
}) {
  const hasTrust = (trust?.points.length ?? 0) > 0;
  const hasSchedule = (schedule?.rows.length ?? 0) > 0;
  const hasMaterials = (materials?.items.length ?? 0) > 0;
  const hasNeeds = (needs?.items.length ?? 0) > 0;

  if (!subscription && !hasTrust && !hasSchedule && !hasMaterials && !hasNeeds) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {subscription && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-green-band p-[clamp(20px,2.4vw,28px)]">
          <div className="flex flex-col gap-1">
            <p className="text-[clamp(18px,1.7vw,22px)] font-bold text-ink">
              {subscription.title}
            </p>
            <p className="text-[14px] text-green-dark">{subscription.note}</p>
          </div>

          <Link
            href={subscription.href}
            className="rounded-full bg-green px-[22px] py-[13px] text-[14px] font-semibold text-white transition hover:bg-green-dark"
          >
            {subscription.cta}
          </Link>
        </div>
      )}

      {(hasTrust || hasSchedule) && (
        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
          {hasTrust && trust && (
            <div className="flex items-start justify-between gap-4 rounded-[22px] border border-line bg-surface p-[22px]">
              <div className="flex min-w-0 flex-col gap-3">
                <h3 className="text-[clamp(19px,1.8vw,24px)] font-semibold text-ink">
                  {trust.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {trust.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <Tick />
                      <span className="text-[14px] text-ink/75">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {trust.image && (
                /* A fixed shape, not the height of the list beside it: a
                   portrait that stretches to whatever the office wrote in
                   four bullets is a different picture every page. */
                <div className="hidden aspect-[3/4] w-[clamp(110px,14vw,170px)] shrink-0 self-start overflow-hidden rounded-[16px] bg-stone [@media(min-width:520px)]:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={trust.image} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          )}

          {hasSchedule && schedule && (
            <div className="rounded-[22px] border border-line bg-surface p-[22px]">
              <h3 className="text-[clamp(19px,1.8vw,24px)] font-semibold text-ink">
                {schedule.title}
              </h3>
              <p className="mt-1 text-[13px] text-ink-55">{schedule.note}</p>

              <ul className="mt-3">
                {schedule.rows.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-4 border-b border-line py-[11px] last:border-0"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-green" />
                      <span className="text-[14px] text-ink">{row.label}</span>
                    </span>
                    {row.value && (
                      <span className="shrink-0 text-[13px] text-ink-55">{row.value}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {hasMaterials && materials && (
        <div className="rounded-[22px] border border-line bg-surface p-[22px]">
          <h3 className="text-[clamp(19px,1.8vw,24px)] font-semibold text-ink">
            {materials.title}
          </h3>
          <p className="mt-1 text-[13px] text-ink-55">{materials.note}</p>

          <ul className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(130px,1fr))]">
            {materials.items.map((item) => (
              <li key={item.label} className="flex flex-col gap-2">
                {/* A tile with no photo is still a tile: the sand ground keeps
                    the row even while the office is still uploading. */}
                <div className="h-[96px] overflow-hidden rounded-[14px] bg-sand">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <span className="text-center text-[13px] text-ink">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasNeeds && needs && (
        <div className="rounded-[22px] border border-line bg-surface p-[22px]">
          <h3 className="text-[clamp(19px,1.8vw,24px)] font-semibold text-ink">
            {needs.title}
          </h3>

          <ul className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
            {needs.items.map((item) => (
              <li
                key={item}
                className="flex flex-col gap-2.5 rounded-[14px] bg-paper px-3.5 py-4"
              >
                <Tick size={26} />
                <span className="text-[14px] font-semibold text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The one tick, so the two lists cannot drift apart. */
function Tick({ size = 20 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[6px] bg-green text-white"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
