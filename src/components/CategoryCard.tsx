import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Category } from "@/lib/types";
import { Thumb } from "./Thumb";

export function CategoryCard({
  category,
  locale,
  label,
  basePath = "category",
}: {
  category: Category;
  locale: Locale;
  label: string;
  basePath?: "category" | "subcategory";
}) {
  return (
    <Link
      href={`/${locale}/${basePath}/${category.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        <Thumb src={category.image_full_path} alt={category.name} rounded="rounded-none" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold text-ink group-hover:text-primary">
          {category.name}
        </h3>
        {category.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            {category.description}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {label}
          <svg
            className="rtl-flip h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
