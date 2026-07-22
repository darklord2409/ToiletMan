import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/i18n/locales";
import { absoluteMediaUrl } from "@/lib/media";
import type { PublicStoreSettings } from "@/types/api";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { AccountNavLink } from "@/components/layout/AccountNavLink";

export async function Header({ locale, settings }: { locale: Locale; settings: PublicStoreSettings }) {
  const t = await getTranslations({ locale, namespace: "common" });
  const logo = absoluteMediaUrl(settings.logo_url);

  return (
    <header className="sticky top-0 z-30 border-b border-box bg-surface/95 backdrop-blur dark:border-box-dark dark:bg-surface-dark/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-bold text-brand dark:text-brand-dark">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={settings.store_name} className="h-8 w-8 rounded-l object-cover" />
          ) : null}
          {settings.store_name || t("brand")}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href={`/${locale}/catalog`} className="hover:text-brand dark:hover:text-brand-dark">
            {t("nav.catalog")}
          </Link>
          <Link href={`/${locale}/about`} className="hover:text-brand dark:hover:text-brand-dark">
            {t("nav.about")}
          </Link>
          <Link href={`/${locale}/delivery`} className="hover:text-brand dark:hover:text-brand-dark">
            {t("nav.delivery")}
          </Link>
          <Link href={`/${locale}/contact`} className="hover:text-brand dark:hover:text-brand-dark">
            {t("nav.contact")}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher currentLocale={locale} locales={locales} />
          <Link
            href={`/${locale}/cart`}
            className="rounded-l bg-box px-3 py-1.5 text-sm font-medium hover:bg-wathet dark:bg-box-dark dark:hover:bg-wathet-dark"
          >
            {t("nav.cart")}
          </Link>
          <AccountNavLink locale={locale} accountLabel={t("nav.account")} loginLabel={t("nav.login")} />
        </div>
      </div>
    </header>
  );
}
