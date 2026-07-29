import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { RegisterForm } from "@/components/auth/RegisterForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "en");
  return { title: dict.auth.register, robots: { index: false, follow: false } };
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ phone?: string }>;
}) {
  const { locale: raw } = await params;
  const { phone } = await searchParams;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return (
    <RegisterForm
      locale={locale}
      dict={dict.auth as unknown as Record<string, string>}
      locationDict={dict.location as unknown as Record<string, string>}
      initialPhone={phone ?? ""}
    />
  );
}
