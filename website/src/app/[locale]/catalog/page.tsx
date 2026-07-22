import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { getCategoryTree, listProducts } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return buildPageMetadata({
    title: t("title"),
    pathWithoutLocale: "/catalog",
    locale: locale as Locale,
  });
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const t = await getTranslations({ locale, namespace: "catalog" });

  const [categories, result] = await Promise.all([
    getCategoryTree(),
    listProducts({
      page,
      page_size: PAGE_SIZE,
      sort_by: sp.sort === "price" ? "price" : undefined,
      sort_order: sp.sort === "priceDesc" ? "desc" : "asc",
    }),
  ]);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[220px_1fr]">
      <aside>
        <CategoryNav categories={categories} locale={locale as Locale} allLabel={t("allCategories")} />
      </aside>
      <div>
        <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
        <ProductGrid
          products={result.items}
          locale={locale as Locale}
          outOfStockLabel={t("outOfStock")}
          emptyLabel={t("empty")}
        />
        <Pagination
          page={page}
          totalPages={result.meta.total_pages}
          basePath={`/${locale}/catalog`}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
