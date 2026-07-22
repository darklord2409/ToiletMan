import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/locales";
import { getStoreSettings } from "@/lib/storefront";
import { buildOrganizationJsonLd } from "@/lib/seo";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QueryProvider } from "@/components/layout/QueryProvider";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://toiletman.uz"),
  title: {
    default: "ToiletMan",
    template: "%s | ToiletMan",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();
  const settings = await getStoreSettings();
  const organizationJsonLd = buildOrganizationJsonLd(settings);

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <Header locale={locale as Locale} settings={settings} />
            <main className="flex-1">{children}</main>
            <Footer locale={locale as Locale} settings={settings} />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
