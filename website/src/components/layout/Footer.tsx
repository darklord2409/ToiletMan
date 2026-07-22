import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import type { PublicStoreSettings } from "@/types/api";

export async function Footer({ locale, settings }: { locale: Locale; settings: PublicStoreSettings }) {
  const t = await getTranslations({ locale, namespace: "common" });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-brand-gradient-soft">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="text-lg font-bold text-brand-light">{settings.store_name || t("brand")}</div>
          {settings.address ? <p className="mt-2 text-sm text-ink-muted">{settings.address}</p> : null}
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold uppercase text-ink-muted">{t("footer.info")}</div>
          <ul className="space-y-1 text-sm text-ink">
            <li>
              <Link href={`/${locale}/about`} className="hover:text-brand-light">
                {t("nav.about")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/delivery`} className="hover:text-brand-light">
                {t("nav.delivery")}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/catalog`} className="hover:text-brand-light">
                {t("nav.catalog")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold uppercase text-ink-muted">{t("footer.contacts")}</div>
          <ul className="space-y-1 text-sm text-ink">
            {settings.phone ? (
              <li>
                <a href={`tel:${settings.phone}`} className="hover:text-brand-light">
                  {settings.phone}
                </a>
              </li>
            ) : null}
            {settings.support_email ? (
              <li>
                <a href={`mailto:${settings.support_email}`} className="hover:text-brand-light">
                  {settings.support_email}
                </a>
              </li>
            ) : null}
            {settings.telegram_url ? (
              <li>
                <a href={settings.telegram_url} target="_blank" rel="noreferrer" className="hover:text-brand-light">
                  Telegram
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs text-ink-muted">
        © {year} {settings.store_name || t("brand")}. {t("footer.rights")}
      </div>
    </footer>
  );
}
