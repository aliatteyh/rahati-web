import Link from "next/link";
import { Container, Section, SectionHead } from "./primitives";

/** One card. Shaped here rather than taken from an API type, because the
 *  catalogue comes from the panel's sections and the price from its services —
 *  two shapes the card has no reason to know about. */
export type NaqiServiceItem = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  href: string;
  /** Already formatted; omitted when no price is known for this card. */
  priceLabel?: string | null;
};

/**
 * The services grid (§4 §01).
 *
 * One card per service the panel publishes — not a fixed three, because the
 * catalogue is the office's to change and a layout that assumes a count breaks
 * the day they add a fourth.
 *
 * The mono index is structural: it numbers the catalogue in the order the panel
 * set, which is the order a customer is meant to read it in.
 */
export function NaqiServices({
  index,
  label,
  title,
  intro,
  items,
  fromLabel,
  viewLabel,
}: {
  index: string;
  label: string;
  title: string;
  intro?: string;
  items: NaqiServiceItem[];
  fromLabel: string;
  viewLabel: string;
}) {
  if (items.length === 0) return null;

  return (
    <Section id="services" className="bg-surface">
      <Container>
        <SectionHead index={index} label={label} title={title} intro={intro} />

        <ul className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
          {items.map((item, i) => {
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group block h-full overflow-hidden rounded-[20px] bg-paper transition hover:-translate-y-[3px] hover:shadow-hover"
                >
                  <div className="relative h-[150px] bg-stone">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[12.5px] text-ink-45">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item.priceLabel && (
                        <span className="rounded-full bg-surface px-3 py-1 text-[12.5px] font-medium text-ink">
                          {fromLabel} {item.priceLabel}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-[16px] font-semibold text-ink">
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-[13px] leading-[1.7] text-ink-55">
                        {item.description}
                      </p>
                    )}

                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-green">
                      {viewLabel}
                      <span aria-hidden className="rtl-flip">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
