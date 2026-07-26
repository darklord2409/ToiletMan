"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { Locale } from "@/i18n/locales";

const FLAGS: Record<Locale, string> = {
  ru: "🇷🇺",
  en: "🇬🇧",
  uz: "🇺🇿",
};

export function LocaleSwitcher({
  currentLocale,
  locales,
}: {
  currentLocale: Locale;
  locales: readonly Locale[];
}) {
  const pathname = usePathname();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // pathname always starts with /{locale}/... (localePrefix: "always")
  const rest = pathname.split("/").slice(2).join("/");

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-l px-2 py-1.5 text-xs font-semibold uppercase text-ink-muted hover:bg-box hover:text-brand-light"
      >
        <span className="text-base leading-none">{FLAGS[currentLocale]}</span>
        {currentLocale}
        <IconChevronDown open={open} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-l border border-line bg-surface-raised shadow-lg"
        >
          {locales.map((locale) => (
            <Link
              key={locale}
              href={`/${locale}/${rest}`}
              onClick={() => setOpen(false)}
              className={
                "flex items-center gap-2 px-3 py-2 text-sm hover:bg-box " +
                (locale === currentLocale ? "text-brand-light" : "text-ink")
              }
            >
              <span className="text-base leading-none">{FLAGS[locale]}</span>
              {t(`locales.${locale}`)}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={"h-3 w-3 transition-transform " + (open ? "rotate-180" : "")}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}
