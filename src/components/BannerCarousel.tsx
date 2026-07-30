"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Thumb } from "./Thumb";
import type { Locale } from "@/i18n/config";
import type { Banner } from "@/lib/types";

function target(b: Banner, locale: Locale): { href: string; external: boolean } | null {
  if (b.resource_type === "service" && b.service?.slug)
    return { href: `/${locale}/service/${b.service.slug}`, external: false };
  if (b.resource_type === "category" && b.category?.slug)
    return { href: `/${locale}/category/${b.category.slug}`, external: false };
  if (b.resource_type === "link" && b.redirect_link)
    return { href: b.redirect_link, external: true };
  return null;
}

function Slide({
  b,
  locale,
  variant = "strip",
}: {
  b: Banner;
  locale: Locale;
  variant?: "strip" | "hero";
}) {
  const img = (
    <div
      className={
        variant === "hero"
          ? "aspect-square w-full overflow-hidden rounded-[2rem] shadow-lg"
          : "aspect-[16/6] w-full overflow-hidden rounded-2xl sm:aspect-[16/5]"
      }
    >
      <Thumb src={b.banner_image_full_path} alt="" rounded={variant === "hero" ? "rounded-[2rem]" : "rounded-2xl"} />
    </div>
  );
  const t = target(b, locale);
  if (!t) return img;
  const wrap = (child: ReactNode) =>
    t.external ? (
      <a href={t.href} target="_blank" rel="noopener noreferrer" className="block">
        {child}
      </a>
    ) : (
      <Link href={t.href} className="block">
        {child}
      </Link>
    );
  return wrap(img);
}

export function BannerCarousel({
  banners,
  locale,
  variant = "strip",
}: {
  banners: Banner[];
  locale: Locale;
  variant?: "strip" | "hero";
}) {
  const slides = banners.filter((b) => b.banner_image_full_path);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setI((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const active = i % slides.length;

  const dots = slides.length > 1 && (
    <div
      className={
        variant === "hero"
          ? "absolute inset-x-0 bottom-4 flex justify-center gap-2"
          : "mt-3 flex justify-center gap-2"
      }
    >
      {slides.map((_, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => setI(idx)}
          aria-label={`Slide ${idx + 1}`}
          className={`h-2 rounded-full transition-all ${
            idx === active
              ? "w-6 bg-primary"
              : variant === "hero"
                ? "w-2 bg-white/70"
                : "w-2 bg-border"
          }`}
        />
      ))}
    </div>
  );

  if (variant === "hero") {
    return (
      <div className="relative">
        <Slide b={slides[active]} locale={locale} variant="hero" />
        {dots}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8">
      <Slide b={slides[active]} locale={locale} />
      {dots}
    </section>
  );
}
