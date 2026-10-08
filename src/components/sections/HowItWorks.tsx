import { Container, Section, SectionHead } from "./primitives";

/**
 * How it works (§4 §03).
 *
 * Four steps on a band of its own colour, each under a hairline with a mono
 * number above it. The numbers are information, not ornament: the steps happen
 * in this order and the reader needs to know that.
 *
 * The rule sits on top of each column rather than between them, so a column
 * that wraps to the next row still opens with its own line.
 */
export function HowItWorks({
  index,
  label,
  title,
  intro,
  steps,
}: {
  index: string;
  label: string;
  title: string;
  intro?: string;
  steps: { title: string; text: string }[];
}) {
  if (steps.length === 0) return null;

  return (
    <Section id="how-it-works" className="bg-paper-alt">
      <Container>
        <SectionHead index={index} label={label} title={title} intro={intro} />

        <ol className="grid gap-x-8 gap-y-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
          {steps.map((step, i) => (
            <li key={step.title} className="border-t border-line-strong pt-5">
              <span className="font-mono text-[13px] font-medium text-green">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-[18px] font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.8] text-ink-62">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
