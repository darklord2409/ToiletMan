"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/i18n/locales";

export function LocaleSwitcher({
  currentLocale,
  locales,
}: {
  currentLocale: Locale;
  locales: readonly Locale[];
}) {
  const pathname = usePathname();
  // pathname always starts with /{locale}/... (localePrefix: "always")
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <div className="flex items-center gap-1 text-xs font-medium uppercase">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}/${rest}`}
          className={
            locale === currentLocale
              ? "rounded px-1.5 py-1 text-brand-light"
              : "rounded px-1.5 py-1 text-ink-muted hover:text-brand-light"
          }
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}
