import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/locales";
import { absoluteMediaUrl, siteUrl } from "@/lib/media";
import type { ProductListItem, PublicStoreSettings } from "@/types/api";

/** `alternates.languages` for every page -- same path, every locale, so
 * search engines know these are translations of one another rather than
 * duplicate content. `pathWithoutLocale` starts with "/", e.g. "/catalog". */
export function buildAlternates(pathWithoutLocale: string, currentLocale: Locale) {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = siteUrl(`/${locale}${pathWithoutLocale}`);
  }
  return {
    canonical: siteUrl(`/${currentLocale}${pathWithoutLocale}`),
    languages,
  };
}

export function buildPageMetadata(params: {
  title: string;
  description?: string;
  pathWithoutLocale: string;
  locale: Locale;
  image?: string | null;
  noindex?: boolean;
}): Metadata {
  const { title, description, pathWithoutLocale, locale, image, noindex } = params;
  const canonicalUrl = siteUrl(`/${locale}${pathWithoutLocale}`);
  return {
    title,
    description,
    alternates: buildAlternates(pathWithoutLocale, locale),
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "ToiletMan",
      locale,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildProductJsonLd(product: ProductListItem, locale: Locale) {
  const translation = product.translations?.[locale];
  const name = translation?.name || product.name;
  const description = translation?.description || product.description || undefined;
  const availability =
    product.availability_status === "out_of_stock"
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    sku: product.sku,
    image: absoluteMediaUrl(product.primary_image_url),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability,
      url: siteUrl(`/${locale}/product/${product.slug}`),
    },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildOrganizationJsonLd(settings: PublicStoreSettings) {
  const sameAs = [settings.telegram_url, settings.whatsapp_url, settings.instagram_url].filter(
    (url): url is string => Boolean(url),
  );
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.store_name,
    logo: absoluteMediaUrl(settings.logo_url),
    telephone: settings.phone ?? undefined,
    address: settings.address ? { "@type": "PostalAddress", streetAddress: settings.address } : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}
