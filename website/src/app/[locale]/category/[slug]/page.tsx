import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { locales } from "@/i18n/locales";
import { findCategoryBySlug, flattenCategories, getCategoryTree, listProducts } from "@/lib/storefront";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/media";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";

const PAGE_SIZE = 24;

export async function generateStaticParams() {
  const categories = await getCategoryTree();
  const flat = flattenCategories(categories);
  return locales.flatMap((locale) => flat.map((category) => ({ locale, slug: category.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const categories = await getCategoryTree();
  const category = findCategoryBySlug(categories, slug);
  if (!category) return {};
  return buildPageMetadata({
    title: category.name,
    pathWithoutLocale: `/category/${slug}`,
    locale: locale as Locale,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const t = await getTranslations({ locale, namespace: "catalog" });
  const tProduct = await getTranslations({ locale, namespace: "product" });

  const categories = await getCategoryTree();
  const category = findCategoryBySlug(categories, slug);
  if (!category) notFound();

  const result = await listProducts({ category_id: category.id, page, page_size: PAGE_SIZE });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tProduct("breadcrumbHome"), url: siteUrl(`/${locale}`) },
    { name: tProduct("breadcrumbCatalog"), url: siteUrl(`/${locale}/catalog`) },
    { name: category.name, url: siteUrl(`/${locale}/category/${slug}`) },
  ]);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[220px_1fr]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <aside>
        <CategoryNav categories={categories} locale={locale as Locale} activeSlug={slug} allLabel={t("allCategories")} />
      </aside>
      <div>
        <h1 className="mb-6 text-2xl font-bold">{category.name}</h1>
        <ProductGrid
          products={result.items}
          locale={locale as Locale}
          outOfStockLabel={t("outOfStock")}
          emptyLabel={t("empty")}
        />
        <Pagination
          page={page}
          totalPages={result.meta.total_pages}
          basePath={`/${locale}/category/${slug}`}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
