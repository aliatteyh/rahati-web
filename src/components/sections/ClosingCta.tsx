import Link from "next/link";
import { Container, Section } from "./primitives";

/**
 * The closing call to action (§4, the green band).
 *
 * Ink rather than a gradient: there is no gradient anywhere in this design,
 * and one here would be the only soft edge on an otherwise flat page. The
 * button is white because it sits on the darkest ground the page has — the
 * one place the ink button cannot be seen.
 */
export function ClosingCta({
  title,
  text,
  buttonLabel,
  href,
}: {
  title: string;
  text: string;
  buttonLabel: string;
  href: string;
}) {
  return (
    <Section className="bg-surface">
      <Container>
        <div className="overflow-hidden rounded-card bg-ink px-[clamp(24px,5vw,64px)] py-[clamp(40px,6vw,72px)] text-center">
          <h2 className="text-[clamp(26px,3vw,40px)] font-semibold leading-[1.3] text-white text-balance">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15.5px] leading-[1.85] text-white/70">
            {text}
          </p>
          <Link
            href={href}
            className="mt-9 inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-ink transition hover:bg-stone-hover"
          >
            {buttonLabel}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
