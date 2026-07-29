import Link from "next/link";

export function SectionHeader({
  title,
  subtitle,
  href,
  seeAllLabel,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  seeAllLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {href && seeAllLabel && (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-primary hover:text-primary-dark"
        >
          {seeAllLabel}
        </Link>
      )}
    </div>
  );
}
