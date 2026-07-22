import { publicGet, publicGetOrNull } from "@/lib/publicApiClient";
import type {
  Banner,
  CatalogFiltersResponse,
  CategoryTreeNode,
  PaginatedResponse,
  ProductDetailResponse,
  ProductListItem,
  PublicStoreSettings,
  StaticPage,
} from "@/types/api";

export function getStoreSettings() {
  return publicGet<PublicStoreSettings>("/settings/public", { revalidate: 300 });
}

export function getBanners() {
  return publicGet<Banner[]>("/storefront/banners", { revalidate: 300 });
}

export function getCategoryTree() {
  return publicGet<CategoryTreeNode[]>("/storefront/categories/tree", { revalidate: 300 });
}

/** Category endpoints only expose id-based filtering; public URLs need
 * slugs, so flatten the tree once and look the id up client/server side
 * rather than adding a slug-lookup endpoint just for this. */
export function findCategoryBySlug(
  categories: CategoryTreeNode[],
  slug: string,
): CategoryTreeNode | undefined {
  for (const category of categories) {
    if (category.slug === slug) return category;
    const found = findCategoryBySlug(category.children, slug);
    if (found) return found;
  }
  return undefined;
}

export function flattenCategories(categories: CategoryTreeNode[]): CategoryTreeNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

export interface ListProductsParams {
  [key: string]: string | number | boolean | undefined;
  category_id?: string;
  manufacturer_id?: string;
  product_type_id?: string;
  collection_id?: string;
  is_featured?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export function listProducts(params: ListProductsParams = {}) {
  return publicGet<PaginatedResponse<ProductListItem>>("/storefront/products", {
    searchParams: params,
    revalidate: params.search ? 0 : 300,
  });
}

export function getProductFilters(categoryId?: string) {
  return publicGet<CatalogFiltersResponse>("/storefront/products/filters", {
    searchParams: { category_id: categoryId },
    revalidate: 300,
  });
}

export function getProductBySlug(slug: string) {
  return publicGetOrNull<ProductDetailResponse>(
    `/storefront/products/by-slug/${encodeURIComponent(slug)}/detail`,
    { revalidate: 300 },
  );
}

/** Paginates through every active product's slug -- used by sitemap.ts and
 * product/[slug]'s generateStaticParams. Catalog is small enough (a few
 * hundred rows) that fetching everything at build time is cheap and much
 * simpler than trying to guess a "featured only" cutoff. */
export async function listAllProductSlugs(): Promise<string[]> {
  const pageSize = 100;
  const slugs: string[] = [];
  let page = 1;
  for (;;) {
    const result = await listProducts({ page, page_size: pageSize });
    slugs.push(...result.items.map((item) => item.slug));
    if (page >= result.meta.total_pages) break;
    page += 1;
  }
  return slugs;
}

export function listPublishedPages() {
  return publicGet<StaticPage[]>("/storefront/pages", { revalidate: 3600 });
}

export function getPageBySlug(slug: string) {
  return publicGetOrNull<StaticPage>(`/storefront/pages/${encodeURIComponent(slug)}`, {
    revalidate: 3600,
  });
}
