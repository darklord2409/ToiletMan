import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { buildPageMetadata } from "@/lib/seo";
import { RegisterForm } from "@/components/account/RegisterForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return buildPageMetadata({
    title: t("registerTitle"),
    pathWithoutLocale: "/register",
    locale: locale as Locale,
    noindex: true,
  });
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">{t("registerTitle")}</h1>
      <RegisterForm locale={locale as Locale} />
    </div>
  );
}
