import { SectionHeader } from "@/components/SectionHeader";

export interface Highlight {
  icon?: string | null;
  title?: string | null;
  description?: string | null;
}

/**
 * The promises the site opens with, straight from the admin panel.
 *
 * Nothing here is written in the front end. The row is whatever the owner has
 * entered — four items, or two, or none — because these claims change with the
 * season and with what turns out to persuade people, and a word change should
 * not need a developer, a build and a deploy in two languages.
 *
 * Empty means the section does not exist: an "why choose us" heading over an
 * empty row is worse than no heading at all.
 */
export function HomeHighlights({
  items,
  title,
  subtitle,
}: {
  items: Highlight[];
  title: string;
  subtitle?: string;
}) {
  const shown = items.filter((i) => i.title);
  if (shown.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16">
      <SectionHeader title={title} subtitle={subtitle} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-5 text-center transition hover:border-primary hover:shadow-md"
          >
            {item.icon && (
              <span aria-hidden className="block text-4xl leading-none">
                {item.icon}
              </span>
            )}
            <h3 className="mt-3 text-base font-bold text-ink">{item.title}</h3>
            {item.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
