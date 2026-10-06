import Link from "next/link";
import type { ReactNode } from "react";
import { Container, Button } from "./primitives";
import { HeroHeadline } from "./HeroHeadline";

/**
 * The opening block (§4 Hero).
 *
 * Two columns that collapse below ~460px of room each, which is what the
 * reference's `auto-fit` does without naming a breakpoint. The headline's
 * second line is the brand green at a lighter weight — the one place on the
 * page where a sentence changes colour mid-way, and the reason it reads as a
 * promise rather than a label.
 *
 * The starting price is passed in rather than written here: it comes from the
 * panel's own variations, and a number typed into a page is a number that goes
 * stale the first time the office changes a price.
 */
export function NaqiHero({
  eyebrow,
  headlines,
  rotate,
  rotateSeconds,
  subtitle,
  ctaLabel,
  ctaHref,
  ctaNote,
  secondaryLabel,
  secondaryHref,
  facts,
  media,
  stats,
}: {
  eyebrow: string;
  /** One headline, or several for the page to move between. */
  headlines: { top: string; bottom?: string }[];
  rotate: boolean;
  rotateSeconds: number;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  ctaNote?: string;
  secondaryLabel: string;
  secondaryHref: string;
  facts: string[];
  /** The picture column — a carousel of the panel's banners. */
  media: ReactNode;
  /** The counted figures under the headline; omitted when none qualify. */
  stats?: { value: string; label: string }[];
}) {
  return (
    <section className="bg-paper">
      <Container className="grid gap-12 py-[clamp(48px,6vw,88px)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))] items-center">
        <div>
          <div className="flex items-center gap-3 text-green">
            <span aria-hidden className="h-px w-9 bg-green opacity-60" />
            <span className="text-[13px] font-semibold tracking-[0.1em]">
              {eyebrow}
            </span>
          </div>

          <HeroHeadline headlines={headlines} rotate={rotate} seconds={rotateSeconds} />

          <p className="mt-6 max-w-[520px] text-[17px] leading-[1.8] text-ink-62">
            {subtitle}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button href={ctaHref} tone="green">
              {ctaLabel}
              {ctaNote && (
                <span className="font-normal text-white/70">· {ctaNote}</span>
              )}
            </Button>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center rounded-full border border-line-strong px-6 py-3.5 text-[15px] font-semibold text-ink transition hover:bg-stone-hover"
            >
              {secondaryLabel}
            </Link>
          </div>

          {facts.length > 0 && (
            <ul className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-[14px] text-ink-55">
              {facts.map((fact) => (
                <li key={fact} className="inline-flex items-center gap-2">
                  <svg
                    aria-hidden
                    className="h-4 w-4 text-green"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {fact}
                </li>
              ))}
            </ul>
          )}

          {/* Counted, never typed — and absent rather than small. A figure the
              server withheld is one that would have said less than nothing. */}
          {stats && stats.length > 0 && (
            <dl className="mt-10 flex flex-wrap items-start gap-x-12 gap-y-6 border-t border-line pt-7">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-mono text-[26px] font-semibold text-ink">
                      {stat.value}
                    </span>
                    <span className="mt-1 block text-[13px] text-ink-55">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {media}
      </Container>
    </section>
  );
}
