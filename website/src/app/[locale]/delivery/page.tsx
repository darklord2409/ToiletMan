import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { getStoreSettings } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return buildPageMetadata({
    title: t("nav.delivery"),
    pathWithoutLocale: "/delivery",
    locale: locale as Locale,
  });
}

export default async function DeliveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const settings = await getStoreSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">{t("nav.delivery")}</h1>
      {settings.delivery_info ? (
        <p className="whitespace-pre-line text-lg leading-relaxed text-ink-muted">{settings.delivery_info}</p>
      ) : (
        <p className="text-ink-muted">—</p>
      )}
    </div>
  );
}
