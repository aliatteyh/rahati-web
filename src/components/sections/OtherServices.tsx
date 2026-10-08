import Link from "next/link";

/**
 * The other things we do (handoff §5).
 *
 * A customer who opens the part-time page and finds it is not what they
 * wanted has one of two ways out: the top bar, or this. The list is the
 * panel's own ordered catalogue minus the page they are on, so it never
 * offers a card that leads back to itself, and it keeps the numbering of the
 * services section on the home page — the same list, read in the same order.
 */
export function OtherServices({
  title,
  items,
  fromLabel,
}: {
  title: string;
  items: { id: string; name: string; href: string; priceLabel?: string | null; index: number }[];
  fromLabel: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="py-[clamp(48px,6vw,80px)]">
      <div className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)]">
        <h2 className="mb-[18px] text-[clamp(20px,2vw,26px)] font-semibold text-ink">
          {title}
        </h2>

        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex h-full items-center justify-between gap-3 rounded-[18px] border border-line bg-surface p-[18px] transition hover:border-green"
              >
                <span className="flex flex-col gap-1">
                  <span dir="ltr" className="font-mono text-[11.5px] text-ink-45">
                    {String(item.index).padStart(2, "0")}
                  </span>
                  <span className="text-[15.5px] font-semibold text-ink">{item.name}</span>
                  {item.priceLabel && (
                    <span className="text-[12.5px] font-semibold text-green">
                      {fromLabel} {item.priceLabel}
                    </span>
                  )}
                </span>

                <span
                  aria-hidden
                  className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-paper text-ink"
                >
                  <span className="rtl-flip">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
