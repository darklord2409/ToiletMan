import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { buildPageMetadata } from "@/lib/seo";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return buildPageMetadata({
    title: t("checkoutTitle"),
    pathWithoutLocale: "/checkout",
    locale: locale as Locale,
    noindex: true,
  });
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <CheckoutForm locale={locale as Locale} />
    </div>
  );
}
