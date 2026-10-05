import Link from "next/link";

/**
 * The heading above every non-Naqi section — and now in Naqi's proportions.
 *
 * Restyled here rather than at each call site: seven sections use it, and the
 * fastest way to give the whole page one rhythm was to change the one thing
 * they already share. The optional eyebrow lets a section join the page's
 * numbered sequence without a second component.
 */
export function SectionHeader({
  title,
  subtitle,
  href,
  seeAllLabel,
  index,
  label,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  seeAllLabel?: string;
  /** Mono number in the eyebrow, e.g. "02". */
  index?: string;
  /** Eyebrow text; without it no eyebrow is drawn. */
  label?: string;
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6">
      <div>
        {label && (
          <div className="mb-4 flex items-center gap-3 text-green">
            {index && (
              <span className="font-mono text-[13px] font-medium">{index}</span>
            )}
            <span aria-hidden className="h-px w-9 bg-green opacity-60" />
            <span className="text-[13px] font-semibold tracking-[0.1em]">
              {label}
            </span>
          </div>
        )}
        <h2 className="text-[clamp(28px,3vw,42px)] font-semibold leading-[1.4] text-ink text-balance">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-4 max-w-[480px] text-[15.5px] leading-[1.85] text-ink-62">
            {subtitle}
          </p>
        )}
      </div>
      {href && seeAllLabel && (
        <Link
          href={href}
          className="shrink-0 text-[13px] font-semibold text-green transition hover:text-green-dark"
        >
          {seeAllLabel}
        </Link>
      )}
    </div>
  );
}
