import { Container, Section } from "./primitives";

/**
 * How to reach a person (§4 Contact).
 *
 * Every line is the panel's own: phone, email, address. Nothing is written
 * into the page, because a contact detail typed into a website is the one
 * nobody remembers to change when it changes.
 *
 * The phone and the email are plain links. `dir="ltr"` on the number because a
 * phone number written right-to-left is a different number.
 */
export function ContactSection({
  title,
  intro,
  phone,
  email,
  address,
  phoneLabel,
  emailLabel,
  addressLabel,
}: {
  title: string;
  intro?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  phoneLabel: string;
  emailLabel: string;
  addressLabel: string;
}) {
  const rows = [
    phone && { label: phoneLabel, value: phone, href: `tel:${phone}`, ltr: true },
    email && { label: emailLabel, value: email, href: `mailto:${email}`, ltr: true },
    address && { label: addressLabel, value: address, href: null, ltr: false },
  ].filter(Boolean) as {
    label: string;
    value: string;
    href: string | null;
    ltr: boolean;
  }[];

  if (rows.length === 0) return null;

  return (
    <Section id="contact" className="bg-paper">
      <Container>
        <div className="rounded-card bg-green p-[clamp(28px,4vw,56px)] text-white">
          <h2 className="text-[clamp(26px,2.6vw,34px)] font-semibold text-balance">
            {title}
          </h2>
          {intro && (
            <p className="mt-4 max-w-[520px] text-[15.5px] leading-[1.85] text-white/75">
              {intro}
            </p>
          )}

          <dl className="mt-9 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-[12.5px] font-semibold tracking-[0.1em] text-white/60">
                  {row.label}
                </dt>
                <dd className="mt-2 text-[16px] font-medium">
                  {row.href ? (
                    <a
                      href={row.href}
                      dir={row.ltr ? "ltr" : undefined}
                      className="inline-block transition hover:text-mint"
                    >
                      {row.value}
                    </a>
                  ) : (
                    <span>{row.value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  );
}
