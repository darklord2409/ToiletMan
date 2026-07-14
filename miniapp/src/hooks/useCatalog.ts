import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getBanners,
  getCategoriesTree,
  getCollections,
  getProduct,
  getProductDetail,
  getProductFilters,
  listProducts,
  type ProductListParams,
} from "@/api/catalog";

const PAGE_SIZE = 20;

export function useBanners() {
  return useQuery({ queryKey: ["banners"], queryFn: getBanners });
}

export function useCategoriesTree() {
  return useQuery({ queryKey: ["categories-tree"], queryFn: getCategoriesTree });
}

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: () => getCollections({ page_size: 50 }),
  });
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => listProducts({ page_size: PAGE_SIZE, ...params }),
  });
}

export function useInfiniteProducts(params: Omit<ProductListParams, "page">) {
  return useInfiniteQuery({
    queryKey: ["products", "infinite", params],
    queryFn: ({ pageParam }) => listProducts({ page_size: PAGE_SIZE, page: pageParam, ...params }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.total_pages ? lastPage.meta.page + 1 : undefined,
  });
}

export function useProductDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["product-detail", id],
    queryFn: () => getProductDetail(id as string),
    enabled: Boolean(id),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
  });
}

export function useProductFilters(params: { category_id?: string; product_type_id?: string }) {
  return useQuery({
    queryKey: ["product-filters", params],
    queryFn: () => getProductFilters(params),
  });
}
