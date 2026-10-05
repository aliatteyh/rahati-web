import Link from "next/link";
import { Container, Section, SectionHead } from "./primitives";

export type PriceRow = {
  key: string;
  /** Minutes, used only to order the list; never shown. */
  sort: number;
  /** "2 hours", "Studio" — whatever the panel named this option. */
  label: string;
  /** Already formatted for the locale. */
  price: string;
  /** "3 hours · 2 cleaners" — the detail under the name, when there is one. */
  detail?: string | null;
};

/**
 * Pricing (§4 §02): the hourly rate on the left, the fixed packages on the
 * right.
 *
 * Both columns are the panel's own variations. Nothing here is written down —
 * a price typed into a page survives exactly until the office changes it, and
 * then quietly lies.
 *
 * The dark card carries the hourly service because that is the one most people
 * arrive for; the packages sit beside it as the alternative, which is the
 * order the reference puts them in.
 */
export function NaqiPricing({
  index,
  label,
  title,
  intro,
  hourlyTitle,
  hourlyNote,
  hourlyRows,
  hourlyHref,
  hourlyCta,
  packagesTitle,
  packageRows,
  packagesHref,
}: {
  index: string;
  label: string;
  title: string;
  intro?: string;
  hourlyTitle: string;
  hourlyNote?: string;
  hourlyRows: PriceRow[];
  hourlyHref: string;
  hourlyCta: string;
  packagesTitle: string;
  packageRows: PriceRow[];
  packagesHref: string;
}) {
  if (hourlyRows.length === 0 && packageRows.length === 0) return null;

  return (
    <Section id="pricing" className="bg-paper">
      <Container>
        <SectionHead index={index} label={label} title={title} intro={intro} />

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
          {hourlyRows.length > 0 && (
            <div className="rounded-card bg-ink p-[clamp(24px,3vw,36px)] text-white">
              <h3 className="text-[22px] font-semibold">{hourlyTitle}</h3>
              {hourlyNote && (
                <p className="mt-3 text-[14.5px] leading-[1.8] text-white/60">
                  {hourlyNote}
                </p>
              )}

              <ul className="mt-7 space-y-3">
                {hourlyRows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3 last:border-0"
                  >
                    <span className="text-[15px] text-white/80">{row.label}</span>
                    <span className="font-mono text-[15px] font-medium text-mint">
                      {row.price}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={hourlyHref}
                className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-ink transition hover:bg-stone-hover"
              >
                {hourlyCta}
              </Link>
            </div>
          )}

          {packageRows.length > 0 && (
            <div className="rounded-card bg-surface p-[clamp(24px,3vw,36px)]">
              <h3 className="text-[22px] font-semibold text-ink">
                {packagesTitle}
              </h3>

              <ul className="mt-7">
                {packageRows.map((row) => (
                  <li key={row.key}>
                    <Link
                      href={packagesHref}
                      className="flex items-center justify-between gap-4 border-b border-line py-4 transition last:border-0 hover:bg-stone-hover"
                    >
                      <span>
                        <span className="block text-[15px] font-medium text-ink">
                          {row.label}
                        </span>
                        {row.detail && (
                          <span className="mt-0.5 block text-[13px] text-ink-55">
                            {row.detail}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[15px] font-semibold text-green">
                        {row.price}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
