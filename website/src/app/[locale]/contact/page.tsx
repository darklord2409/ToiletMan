import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { getStoreSettings } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return buildPageMetadata({
    title: t("nav.contact"),
    pathWithoutLocale: "/contact",
    locale: locale as Locale,
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const settings = await getStoreSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">{t("nav.contact")}</h1>
      <dl className="space-y-4 text-lg">
        {settings.phone ? (
          <div>
            <dt className="text-sm text-ink-muted">{t("nav.contact")}</dt>
            <dd>
              <a href={`tel:${settings.phone}`} className="text-brand-light hover:underline">
                {settings.phone}
              </a>
            </dd>
          </div>
        ) : null}
        {settings.support_email ? (
          <div>
            <dt className="text-sm text-ink-muted">Email</dt>
            <dd>
              <a href={`mailto:${settings.support_email}`} className="text-brand-light hover:underline">
                {settings.support_email}
              </a>
            </dd>
          </div>
        ) : null}
        {settings.address ? (
          <div>
            <dt className="text-sm text-ink-muted">Address</dt>
            <dd>{settings.address}</dd>
          </div>
        ) : null}
      </dl>

      {settings.working_hours ? (
        <table className="mt-8 w-full max-w-sm text-sm">
          <tbody>
            {DAY_KEYS.map((day) => {
              const hours = settings.working_hours?.[day];
              if (!hours) return null;
              return (
                <tr key={day} className="border-b border-line">
                  <td className="py-1.5 pr-4 capitalize text-ink-muted">{day}</td>
                  <td className="py-1.5">{hours.closed ? "—" : `${hours.open} – ${hours.close}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
