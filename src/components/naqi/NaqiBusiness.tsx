import Link from "next/link";

/**
 * The block addressed to an office rather than a home.
 *
 * It is the one dark section on the page, because the reader it is written for
 * is not the one the rest of the page is written for: somebody buying for a
 * building, who wants to know who turns up, how they are billed and who they
 * ring when something is wrong — and nothing about hourly rates.
 *
 * Built to the handoff's own figures (docs/BUSINESS_SECTION.md): three blocks
 * 32px apart, the picture a third of the row beside a 2×2 grid of terms, and a
 * band at the foot. Everything in it — the words, the sectors, the four terms,
 * the picture and the number — comes from the panel.
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
    <section id="business" className="bg-[#16211D] text-white">
      {/* Half a centimetre above and below — 20px — and no more. The clamp
          that stood here ran to 96px, which made the dark ground read as a
          band of its own with something in the middle of it; nothing at all
          put the first line of type against the edge. This is the small
          margin that keeps everything inside the box. */}
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-[clamp(20px,4vw,48px)] py-5">
        {/* Header — two columns that stack when either one runs out of room,
            sitting on the same baseline so the subtitle ends where the title
            does. */}
        <div className="grid items-end gap-4 gap-x-16 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3 text-[13px] font-semibold text-[#7FD3B6]">
              <span dir="ltr" className="font-mono font-medium tracking-[0.06em]">
                {index}
              </span>
              <span aria-hidden className="h-px w-9 bg-[#7FD3B6]" />
              <span className="tracking-[0.12em] ltr:uppercase">{label}</span>
            </div>

            <h2 className="text-[clamp(28px,3vw,42px)] font-semibold leading-[1.4] [text-wrap:balance]">
              {title}
            </h2>
          </div>

          <div className="flex flex-col gap-3.5">
            <p className="text-[15.5px] leading-[1.85] text-white/[0.66] [text-wrap:pretty]">
              {intro}
            </p>

            {/* The kinds of place we clean, as plain words: a reader looking
                for "clinics" wants to see the word, not to infer it. */}
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/[0.18] px-3 py-1.5 text-[12.5px] text-white/80"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* The picture takes a third and the terms two, and both fall to a row
            of their own when the line is too short for that. */}
        <div className="flex flex-wrap gap-4">
          {image && (
            <div className="relative min-h-[320px] flex-[1_1_320px] self-stretch overflow-hidden rounded-[18px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}

          {/* Two by two, and the rows share the height evenly so the four
              cards end exactly where the picture does. The handoff's own
              auto-fit rule gave three on a wide screen and left the fourth
              alone beside a gap. */}
          <div className="grid min-w-0 flex-[2_1_480px] auto-rows-fr gap-3 [@media(min-width:760px)]:grid-cols-2">
            {points.map((point, i) => (
              <div
                key={point.title}
                className="flex flex-col gap-2 rounded-[18px] border border-white/10 bg-white/[0.05] p-5"
              >
                {/* Numbered because the four are terms to be pointed at in a
                    conversation, not steps in an order. */}
                <span dir="ltr" className="font-mono text-[12px] text-[#7FD3B6]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[15.5px] font-semibold">{point.title}</p>
                <p className="text-[13.5px] leading-[1.7] text-white/60">{point.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-[#0F6B57] px-6 py-5">
          <div className="flex flex-col gap-[3px]">
            <p className="text-[16px] font-semibold">{ctaTitle}</p>
            <p className="text-[13.5px] text-white/[0.72]">{ctaNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 max-[759px]:w-full">
            <Link
              href={quoteHref}
              className="rounded-full bg-white px-[22px] py-[13px] text-center text-[14px] font-semibold text-[#16211D] transition hover:bg-[#7FD3B6] max-[759px]:w-full"
            >
              {quoteLabel}
            </Link>

            {/* The number is written left to right whatever the page does: a
                phone number read backwards is a different number. */}
            {phone && (
              <a
                href={`tel:${phone}`}
                dir="ltr"
                className="rounded-full border border-white/[0.35] px-5 py-[13px] text-center text-[14px] font-semibold text-white transition hover:border-white max-[759px]:w-full"
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
