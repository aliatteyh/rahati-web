import { Container, Section, SectionHead } from "./primitives";

/**
 * The questions people actually ask (§4 FAQ).
 *
 * Built on `<details>` rather than React state: an accordion is the one widget
 * the browser already has, it opens without JavaScript, it is reachable by
 * keyboard for free, and a search engine reads the answers whether or not they
 * are open. A hand-rolled one gives up all four.
 *
 * The questions come from the services themselves — the same ones the app
 * shows — so an answer corrected in the panel is corrected everywhere.
 */
export function FaqSection({
  index,
  label,
  title,
  intro,
  items,
}: {
  index: string;
  label: string;
  title: string;
  intro?: string;
  items: { question: string; answer: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <Section id="faq" className="bg-surface">
      <Container>
        <SectionHead index={index} label={label} title={title} intro={intro} />

        <div className="mx-auto max-w-[760px]">
          {items.map((item) => (
            <details
              key={item.question}
              className="group border-b border-line last:border-0"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-medium text-ink marker:hidden">
                {item.question}
                <span
                  aria-hidden
                  className="shrink-0 text-[20px] leading-none text-green transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 text-[15px] leading-[1.85] text-ink-62">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
