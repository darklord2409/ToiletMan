import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import type { PublicStoreSettings } from "@/types/api";

export async function Footer({ locale, settings }: { locale: Locale; settings: PublicStoreSettings }) {
  const t = await getTranslations({ locale, namespace: "common" });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-box bg-box/60 dark:border-box-dark dark:bg-box-dark/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="text-lg font-bold text-brand dark:text-brand-dark">
            {settings.store_name || t("brand")}
          </div>
          {settings.address ? <p className="mt-2 text-sm text-slate-500">{settings.address}</p> : null}
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold uppercase text-slate-400">{t("footer.info")}</div>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href={`/${locale}/about`} className="hover:text-brand dark:hover:text-brand-dark">
                {t("nav.about")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/delivery`} className="hover:text-brand dark:hover:text-brand-dark">
                {t("nav.delivery")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/catalog`} className="hover:text-brand dark:hover:text-brand-dark">
                {t("nav.catalog")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold uppercase text-slate-400">{t("footer.contacts")}</div>
          <ul className="space-y-1 text-sm">
            {settings.phone ? (
              <li>
                <a href={`tel:${settings.phone}`} className="hover:text-brand dark:hover:text-brand-dark">
                  {settings.phone}
                </a>
              </li>
            ) : null}
            {settings.support_email ? (
              <li>
                <a
                  href={`mailto:${settings.support_email}`}
                  className="hover:text-brand dark:hover:text-brand-dark"
                >
                  {settings.support_email}
                </a>
              </li>
            ) : null}
            {settings.telegram_url ? (
              <li>
                <a
                  href={settings.telegram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brand dark:hover:text-brand-dark"
                >
                  Telegram
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-box px-4 py-4 text-center text-xs text-slate-400 dark:border-box-dark">
        © {year} {settings.store_name || t("brand")}. {t("footer.rights")}
      </div>
    </footer>
  );
}
