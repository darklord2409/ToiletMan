import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { buildPageMetadata } from "@/lib/seo";
import { OrderDetailView } from "@/components/account/OrderDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return buildPageMetadata({
    title: t("myOrders"),
    pathWithoutLocale: "/account",
    locale: locale as Locale,
    noindex: true,
  });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <OrderDetailView locale={locale as Locale} orderId={id} />
    </div>
  );
}
