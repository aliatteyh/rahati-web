/**
 * The pieces every section is built from.
 *
 * Kept together and used everywhere rather than restyled per page: the design
 * repeats five shapes — a chip, a selectable card, a pill, a section eyebrow
 * and a button — and a second definition of any of them is how a grid of
 * "identical" cards ends up with two radii.
 *
 * Measurements come from the handoff's token table (§7) and the inline styles
 * in the HTML references, which that document calls the spec.
 */
import type { ReactNode } from "react";

/** The container every section sits in (§4). */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Vertical rhythm for a full-width band (§4). */
export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-[clamp(56px,7vw,96px)] ${className}`}>
      {children}
    </section>
  );
}

/**
 * The numbered line above every section title.
 *
 * The number is structural, not decoration: the page is read top to bottom and
 * these say where in it you are. On a dark ground the rule and the text lift to
 * mint, because the green disappears into it.
 */
export function Eyebrow({
  index,
  label,
  onDark = false,
}: {
  index?: string;
  label: string;
  onDark?: boolean;
}) {
  const tone = onDark ? "text-mint" : "text-green";

  return (
    <div className={`flex items-center gap-3 ${tone}`}>
      {index && (
        <span className="font-mono text-[13px] font-medium">{index}</span>
      )}
      <span
        aria-hidden
        className={`h-px w-9 ${onDark ? "bg-mint" : "bg-green"} opacity-60`}
      />
      <span className="text-[13px] font-semibold tracking-[0.1em]">{label}</span>
    </div>
  );
}

/** Eyebrow + title + optional intro, in the proportions of §4. */
export function SectionHead({
  index,
  label,
  title,
  intro,
  onDark = false,
}: {
  index?: string;
  label: string;
  title: string;
  intro?: string;
  onDark?: boolean;
}) {
  return (
    <header className="mb-10">
      <Eyebrow index={index} label={label} onDark={onDark} />
      <h2
        className={`mt-4 text-[clamp(28px,3vw,42px)] font-semibold leading-[1.4] text-balance ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {intro && (
        <p
          className={`mt-4 max-w-[480px] text-[15.5px] leading-[1.85] ${
            onDark ? "text-white/70" : "text-ink-62"
          }`}
        >
          {intro}
        </p>
      )}
    </header>
  );
}

/** A selectable chip — hours, days, times, areas (§7). */
export function Chip({
  children,
  selected = false,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      className={`rounded-full border px-4 py-2.5 text-[14px] transition ${
        selected
          ? "border-ink bg-ink text-white"
          : "border-line-strong bg-surface text-ink hover:bg-stone-hover"
      }`}
    >
      {children}
    </button>
  );
}

/** A bigger choice: service type, package, payment method. */
export function SelectCard({
  children,
  selected = false,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-4 text-start transition ${
        selected
          ? "border-ink bg-ink text-white"
          : "border-line-strong bg-surface text-ink hover:bg-stone-hover"
      }`}
    >
      {children}
    </button>
  );
}

/** A small label: a price, a tag, a status. */
export function Pill({
  children,
  tone = "surface",
}: {
  children: ReactNode;
  tone?: "surface" | "green" | "gold" | "danger" | "muted";
}) {
  const tones = {
    surface: "bg-surface text-ink border border-line",
    green: "bg-green-soft text-green",
    gold: "bg-gold text-ink",
    danger: "bg-danger-pill text-danger",
    muted: "bg-black/5 text-ink-55",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * The one button.
 *
 * `ink` is the page's primary action, `green` the one inside green cards where
 * ink would disappear, `outline` the quieter twin that sits beside either.
 */
export function Button({
  children,
  href,
  onClick,
  tone = "ink",
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: "ink" | "green" | "outline" | "white";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const tones = {
    ink: "bg-ink text-white hover:bg-green",
    green: "bg-green text-white hover:bg-green-dark",
    outline: "border border-line-strong text-ink hover:bg-stone-hover",
    white: "bg-white text-ink hover:bg-stone-hover",
  } as const;

  const classes = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition disabled:opacity-50 ${tones[tone]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
