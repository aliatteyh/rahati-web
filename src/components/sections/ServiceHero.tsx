import Link from "next/link";

/** One of the three small boxes under the price. */
export type ServiceFact = { key: string; value: string };

/**
 * The opening block of a service page (handoff §2).
 *
 * It answers, in one screen, the three things a customer asks before they
 * start filling anything in: what this service is, what the cheapest version
 * of it costs, and what a visit actually involves — how long, how many
 * cleaners, whether materials come with them.
 *
 * The index line ("01 / 04 — Services") is structural rather than decorative:
 * the catalogue is a short, ordered list the panel sets, and this says which
 * of them you are looking at. It is only printed when there really is a list.
 *
 * Both buttons stay on the page. The primary one scrolls to the form that is
 * now a few centimetres below — the booking is no longer a second page — and
 * the quiet one goes to the people who answer questions.
 */
export function ServiceHero({
  crumbs,
  index,
  total,
  label,
  title,
  tagline,
  fromLabel,
  price,
  facts,
  bookLabel,
  askLabel,
  askHref,
  images,
}: {
  crumbs: { label: string; href?: string }[];
  index: number | null;
  total: number;
  label: string;
  title: string;
  tagline?: string | null;
  fromLabel: string;
  price?: string | null;
  facts: ServiceFact[];
  bookLabel: string;
  askLabel: string;
  askHref: string;
  images: string[];
}) {
  const [big, ...small] = images;

  return (
    <section className="pb-[clamp(20px,2.5vw,32px)] pt-[clamp(16px,2vw,24px)]">
      <div className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)]">
        <nav className="mb-[clamp(12px,1.5vw,18px)] flex flex-wrap items-center gap-2 text-[13px] text-ink-55">
          {crumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="transition hover:text-green">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-ink">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="grid items-center gap-[clamp(16px,2.5vw,32px)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
          <div className="flex flex-col gap-2.5">
            {index !== null && total > 1 && (
              <div className="flex items-center gap-3 text-[13px] font-semibold text-green">
                <span dir="ltr" className="font-mono font-medium">
                  {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                <span aria-hidden className="h-px w-8 bg-green" />
                <span>{label}</span>
              </div>
            )}

            <h1 className="text-[clamp(22px,2.2vw,28px)] font-semibold leading-[1.4] text-ink text-balance">
              {title}
            </h1>

            {tagline && (
              <p className="max-w-[460px] text-[13.5px] leading-[1.8] text-ink-62">
                {tagline}
              </p>
            )}

            {price && (
              <div className="my-1 flex items-center gap-2.5 border-y border-line py-2">
                <span className="text-[13px] text-ink-55">{fromLabel}</span>
                <span className="text-[18px] font-semibold text-green">{price}</span>
              </div>
            )}

            {facts.length > 0 && (
              <dl className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,120px),1fr))]">
                {facts.map((fact) => (
                  <div
                    key={fact.key}
                    className="rounded-[10px] border border-line bg-surface px-2.5 py-[7px]"
                  >
                    <dt className="text-[11px] text-ink-55">{fact.key}</dt>
                    <dd className="text-[12.5px] font-semibold text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              {/* An anchor, not a route: the form it points at is on this very
                  page now, and a Link would reload what the reader is looking
                  at. */}
              <a
                href="#book"
                className="rounded-full bg-green px-[18px] py-2.5 text-[13px] font-semibold text-white transition hover:bg-green-dark"
              >
                {bookLabel}
              </a>
              <Link
                href={askHref}
                className="rounded-full border border-line-strong px-[18px] py-2.5 text-[13px] font-semibold text-ink transition hover:border-green hover:text-green"
              >
                {askLabel}
              </Link>
            </div>
          </div>

          {/* The pictures: one tall beside two stacked, and a single picture
              simply fills the whole frame rather than leaving two empty
              squares beside it. */}
          {big && (
            <div
              className={`grid h-[clamp(170px,18vw,230px)] gap-2 [grid-template-rows:minmax(0,1fr)] ${
                small.length ? "[grid-template-columns:1.4fr_1fr]" : "grid-cols-1"
              }`}
            >
              <div className="overflow-hidden rounded-[14px] bg-stone">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={big} alt={title} className="h-full w-full object-cover" />
              </div>

              {small.length > 0 && (
                <div className="grid gap-2 [grid-template-rows:repeat(2,minmax(0,1fr))]">
                  {small.slice(0, 2).map((src) => (
                    <div key={src} className="overflow-hidden rounded-[12px] bg-stone">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
