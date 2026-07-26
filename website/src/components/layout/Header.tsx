import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/i18n/locales";
import { absoluteMediaUrl } from "@/lib/media";
import type { PublicStoreSettings } from "@/types/api";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { AccountNavLink } from "@/components/layout/AccountNavLink";
import { MobileNav } from "@/components/layout/MobileNav";

export async function Header({ locale, settings }: { locale: Locale; settings: PublicStoreSettings }) {
  const t = await getTranslations({ locale, namespace: "common" });
  const logo = absoluteMediaUrl(settings.logo_url);

  const navItems = [
    { href: `/${locale}/catalog`, label: t("nav.catalog") },
    { href: `/${locale}/about`, label: t("nav.about") },
    { href: `/${locale}/delivery`, label: t("nav.delivery") },
    { href: `/${locale}/contact`, label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-1">
          <MobileNav
            navItems={navItems}
            cartHref={`/${locale}/cart`}
            cartLabel={t("nav.cart")}
            accountLabel={t("nav.account")}
            loginLabel={t("nav.login")}
            locale={locale}
          />
          <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-bold text-brand-light">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={settings.store_name} className="h-8 w-8 rounded-l object-cover" />
            ) : null}
            {settings.store_name || t("brand")}
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-brand-light">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher currentLocale={locale} locales={locales} />
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href={`/${locale}/cart`}
              className="rounded-l bg-box px-3 py-1.5 text-sm font-medium text-ink hover:bg-line"
            >
              {t("nav.cart")}
            </Link>
            <AccountNavLink locale={locale} accountLabel={t("nav.account")} loginLabel={t("nav.login")} />
          </div>
        </div>
      </div>
    </header>
  );
}
