"use client";

import Link from "next/link";
import { useMe } from "@/hooks/useAuth";
import type { Locale } from "@/i18n/locales";

export function AccountNavLink({
  locale,
  accountLabel,
  loginLabel,
  className,
}: {
  locale: Locale;
  accountLabel: string;
  loginLabel: string;
  className?: string;
}) {
  const { data: me } = useMe();
  return (
    <Link
      href={me ? `/${locale}/account` : `/${locale}/login`}
      className={className ?? "rounded-l bg-brand-button px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"}
    >
      {me ? accountLabel : loginLabel}
    </Link>
  );
}
