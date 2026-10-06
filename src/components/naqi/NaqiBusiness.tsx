import Link from "next/link";
import { Eyebrow } from "./primitives";

/**
 * The block addressed to an office rather than a home.
 *
 * It is the one dark section on the page, because the reader it is written for
 * is not the one the rest of the page is written for: somebody buying for a
 * building, who wants to know who turns up, how they are billed and who they
 * ring when something is wrong — and nothing about hourly rates.
 *
 * The phone is the panel's own, so the number on the page and the number in
 * the footer cannot drift apart.
 */
export function NaqiBusiness({
  index,
  label,
  title,
  intro,
  chips,
  points,
  image,
  ctaTitle,
  ctaNote,
  quoteLabel,
  quoteHref,
  phone,
}: {
  index: string;
  label: string;
  title: string;
  intro: string;
  chips: string[];
  points: { title: string; text: string }[];
  image?: string | null;
  ctaTitle: string;
  ctaNote: string;
  quoteLabel: string;
  quoteHref: string;
  phone?: string | null;
}) {
  return (
    <section id="business" className="bg-ink py-[clamp(56px,7vw,96px)] text-white">
      <div className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)]">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <Eyebrow index={index} label={label} onDark />
            <h2 className="mt-5 text-[clamp(26px,3.2vw,40px)] font-semibold leading-[1.15] [text-wrap:balance]">
              {title}
            </h2>
          </div>

          <div className="lg:pt-10">
            <p className="max-w-[52ch] text-[15.5px] leading-relaxed text-white/70">
              {intro}
            </p>

            {/* The kinds of place we clean, as plain words. A reader looking
                for "clinics" wants to see the word, not to infer it. */}
            <div className="mt-5 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/20 px-4 py-2 text-[13.5px] text-white/80"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {image && (
            <div className="h-[clamp(220px,28vw,340px)] overflow-hidden rounded-[18px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          {/* Numbered because the four are a set of terms to be pointed at in a
              conversation, not steps in an order. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {points.map((point, i) => (
              <div
                key={point.title}
                className="rounded-[18px] bg-white/[0.04] p-5"
              >
                <span className="font-mono text-[12.5px] text-mint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-[16px] font-semibold">{point.title}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">
                  {point.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-5 rounded-[18px] bg-green px-[clamp(20px,2.6vw,32px)] py-6">
          <div>
            <p className="text-[17px] font-semibold">{ctaTitle}</p>
            <p className="mt-1 text-[14px] text-white/80">{ctaNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={quoteHref}
              className="rounded-full bg-white px-6 py-3 text-[14.5px] font-semibold text-ink transition hover:bg-white/90"
            >
              {quoteLabel}
            </Link>

            {/* Shown as text inside a link, and marked left-to-right: a phone
                number written right-to-left is a different number. */}
            {phone && (
              <a
                href={`tel:${phone}`}
                dir="ltr"
                className="rounded-full border border-white/40 px-6 py-3 text-[14.5px] font-semibold text-white transition hover:bg-white/10"
              >
                {phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
