"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/locales";
import { AccountNavLink } from "@/components/layout/AccountNavLink";

interface NavItem {
  href: string;
  label: string;
}

export function MobileNav({
  navItems,
  cartHref,
  cartLabel,
  accountLabel,
  loginLabel,
  locale,
}: {
  navItems: NavItem[];
  cartHref: string;
  cartLabel: string;
  accountLabel: string;
  loginLabel: string;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-l text-ink hover:bg-box"
      >
        {open ? <IconClose /> : <IconBurger />}
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-40 border-b border-line bg-surface px-4 py-4 shadow-lg">
          <nav className="flex flex-col gap-1 text-sm font-medium text-ink-muted" onClick={() => setOpen(false)}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-l px-3 py-2.5 hover:bg-box hover:text-brand-light">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-3 border-t border-line pt-3" onClick={() => setOpen(false)}>
            <Link
              href={cartHref}
              className="flex-1 rounded-l bg-box px-3 py-2 text-center text-sm font-medium text-ink hover:bg-line"
            >
              {cartLabel}
            </Link>
            <AccountNavLink
              locale={locale}
              accountLabel={accountLabel}
              loginLabel={loginLabel}
              className="flex-1 rounded-l bg-brand-button px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconBurger() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
