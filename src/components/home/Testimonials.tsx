import { SectionHeader } from "@/components/SectionHeader";

export interface Testimonial {
  source?: string | null;
  rating?: number | null;
  comment?: string | null;
  author?: string | null;
  service?: string | null;
}

/**
 * What customers actually wrote, on one moving line.
 *
 * Every quote comes from the reviews table — nothing is written into the page.
 * That is the point of the section: a testimonial is a claim about a real
 * person's experience, and the moment one is invented the row stops being
 * evidence and becomes decoration a reader is right to distrust. Nothing to
 * show means no section at all.
 *
 * `source` is carried through so Google reviews can join the same list later
 * without this component changing.
 */
export function Testimonials({
  items,
  title,
  subtitle,
}: {
  items: Testimonial[];
  title: string;
  subtitle?: string;
}) {
  const shown = items.filter((t) => t.comment);
  if (shown.length === 0) return null;

  // The track holds the list twice and travels exactly half its width, which is
  // what makes the loop seamless. With only one or two quotes the copy would be
  // visible beside its original, so the list is padded to at least three first.
  const loop = shown.length >= 3 ? shown : [...shown, ...shown, ...shown].slice(0, 3);
  const track = [...loop, ...loop];

  // Pace it by content: a fixed duration crawls with three cards and races with
  // twelve. Roughly eight seconds per card reads at a comfortable speed.
  const duration = `${Math.max(24, loop.length * 8)}s`;

  return (
    // Same column as every other section, so the row starts and ends where the
    // heading above it does. Running full-bleed made the line livelier and made
    // the page look like two different layouts stacked.
    <section className="mx-auto max-w-6xl px-4 pt-16">
      <SectionHeader title={title} subtitle={subtitle} />

      {/* The spacing lives on the cards, not on the track.
          `gap` puts a space *between* items, so a track of 2n cards has 2n−1
          gaps — half its width is therefore not a whole number of cards, and
          every loop landed slightly off and showed a blank stretch before
          snapping back. A trailing margin on each card gives 2n gaps, half of
          which is exactly n cards, and the seam disappears. */}
      <div className="marquee-viewport mt-6 overflow-hidden">
        <div
          className="marquee-track flex w-max"
          style={{ ["--marquee-duration" as string]: duration }}
        >
          {track.map((t, i) => {
            const stars = Math.max(0, Math.min(5, Math.round(Number(t.rating ?? 0))));
            const initial = (t.author ?? "").trim().charAt(0);

            return (
              <figure
                key={i}
                aria-hidden={i >= loop.length}
                className="me-4 flex w-[17rem] shrink-0 flex-col rounded-2xl border border-border bg-surface p-5 sm:w-[20.5rem] lg:w-[22.6rem]"
              >
                {stars > 0 && (
                  <div aria-label={`${stars}/5`} className="text-accent">
                    {"★".repeat(stars)}
                    <span className="text-border">{"★".repeat(5 - stars)}</span>
                  </div>
                )}

                <blockquote className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-ink">
                  {t.comment}
                </blockquote>

                <figcaption className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-soft text-sm font-bold text-muted"
                  >
                    {initial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {t.author || "—"}
                    </span>
                    {t.service && (
                      <span className="block truncate text-xs text-muted">{t.service}</span>
                    )}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
