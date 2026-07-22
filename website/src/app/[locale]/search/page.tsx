import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { listProducts } from "@/lib/storefront";
import { buildPageMetadata } from "@/lib/seo";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return buildPageMetadata({
    title: t("nav.search"),
    pathWithoutLocale: "/search",
    locale: locale as Locale,
    noindex: true,
  });
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const query = sp.q ?? "";
  const page = Number(sp.page ?? "1") || 1;
  const t = await getTranslations({ locale, namespace: "catalog" });

  const result = query
    ? await listProducts({ search: query, page, page_size: PAGE_SIZE })
    : { items: [], meta: { page: 1, page_size: PAGE_SIZE, total_items: 0, total_pages: 0 } };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <form className="mb-8 flex gap-2" action={`/${locale}/search`}>
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-md rounded-l border border-box bg-white px-4 py-2 dark:border-box-dark dark:bg-box-dark"
        />
        <button type="submit" className="rounded-l bg-brand px-4 py-2 font-semibold text-white dark:bg-brand-dark">
          🔍
        </button>
      </form>

      {query ? (
        <h1 className="mb-6 text-xl font-bold">{t("searchResultsFor", { query })}</h1>
      ) : null}

      <ProductGrid
        products={result.items}
        locale={locale as Locale}
        outOfStockLabel={t("outOfStock")}
        emptyLabel={query ? t("empty") : undefined}
      />
      <Pagination page={page} totalPages={result.meta.total_pages} basePath={`/${locale}/search`} searchParams={sp} />
    </div>
  );
}
