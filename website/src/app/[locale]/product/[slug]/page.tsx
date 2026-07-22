import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { locales } from "@/i18n/locales";
import { getProductBySlug, getStoreSettings, listAllProductSlugs } from "@/lib/storefront";
import { absoluteMediaUrl, siteUrl } from "@/lib/media";
import { buildBreadcrumbJsonLd, buildPageMetadata, buildProductJsonLd } from "@/lib/seo";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductGallery } from "@/components/product/ProductGallery";
import { SpecsTable } from "@/components/product/SpecsTable";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductGrid } from "@/components/catalog/ProductGrid";

export async function generateStaticParams() {
  const slugs = await listAllProductSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const detail = await getProductBySlug(slug);
  if (!detail) return {};
  const { product } = detail;
  const translation = product.translations?.[locale];
  const title = translation?.meta_title || translation?.name || product.name;
  const description = translation?.meta_description || translation?.description || product.description || undefined;
  const image = absoluteMediaUrl(product.primary_image_url);

  return {
    ...buildPageMetadata({
      title,
      description,
      pathWithoutLocale: `/product/${slug}`,
      locale: locale as Locale,
      image,
    }),
    alternates: {
      canonical: product.canonical_url_override || siteUrl(`/${locale}/product/${slug}`),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const detail = await getProductBySlug(slug);
  if (!detail) notFound();
  const { product, images, attributes, recommendations } = detail;

  const t = await getTranslations({ locale, namespace: "product" });
  const tCatalog = await getTranslations({ locale, namespace: "catalog" });
  const settings = await getStoreSettings();
  const translation = product.translations?.[locale];
  const name = translation?.name || product.name;
  const description = translation?.description || product.description;

  const productJsonLd = buildProductJsonLd(product, locale as Locale);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("breadcrumbHome"), url: siteUrl(`/${locale}`) },
    { name: t("breadcrumbCatalog"), url: siteUrl(`/${locale}/catalog`) },
    { name, url: siteUrl(`/${locale}/product/${slug}`) },
  ]);

  const related = [
    ...recommendations.related,
    ...recommendations.same_collection,
    ...recommendations.similar,
  ].slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery
          images={images.map((image) => ({ url: absoluteMediaUrl(image.url) ?? image.url, alt_text: image.alt_text }))}
          productName={name}
        />
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t("sku")}: {product.sku}
          </p>
          <div className="mt-4">
            <PriceTag price={product.price} compareAtPrice={product.compare_at_price} currency={product.currency} size="large" />
          </div>
          <p className="mt-2 text-sm">
            {product.availability_status === "out_of_stock"
              ? tCatalog("outOfStock")
              : product.availability_status === "low_stock"
                ? tCatalog("lowStock")
                : tCatalog("inStock")}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <AddToCartButton
              productId={product.id}
              label={t("addToCart")}
              disabled={product.availability_status === "out_of_stock"}
              locale={locale}
            />
            {settings.telegram_url ? (
              <a
                href={settings.telegram_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-light hover:underline"
              >
                {t("buyInBot")}
              </a>
            ) : null}
          </div>

          {description ? (
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold">{t("description")}</h2>
              <p className="whitespace-pre-line text-ink-muted">{description}</p>
            </div>
          ) : null}

          {attributes.length > 0 ? (
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold">{t("specifications")}</h2>
              <SpecsTable attributes={attributes} locale={locale as Locale} />
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-bold">{t("relatedProducts")}</h2>
          <ProductGrid products={related} locale={locale as Locale} outOfStockLabel={tCatalog("outOfStock")} />
        </section>
      ) : null}
    </div>
  );
}
