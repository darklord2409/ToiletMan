import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type {
  BannerRead,
  CatalogFiltersResponse,
  CategoryTreeNode,
  CollectionRead,
  ManufacturerRead,
  ProductDetailResponse,
  ProductLabelRead,
  ProductListItem,
  ProductRead,
  ProductTypeRead,
} from "@/types/entities";

export interface ProductListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  category_id?: string;
  manufacturer_id?: string;
  product_type_id?: string;
  collection_id?: string;
  is_featured?: boolean;
}

export async function getBanners(): Promise<BannerRead[]> {
  const { data } = await apiClient.get<BannerRead[]>("/storefront/banners");
  return data;
}

export async function getCategoriesTree(): Promise<CategoryTreeNode[]> {
  const { data } = await apiClient.get<CategoryTreeNode[]>("/storefront/categories/tree");
  return data;
}

export async function getManufacturers(
  params: { page?: number; page_size?: number } = {},
): Promise<PaginatedResponse<ManufacturerRead>> {
  const { data } = await apiClient.get<PaginatedResponse<ManufacturerRead>>(
    "/storefront/manufacturers",
    { params },
  );
  return data;
}

export async function getCollections(
  params: { page?: number; page_size?: number } = {},
): Promise<PaginatedResponse<CollectionRead>> {
  const { data } = await apiClient.get<PaginatedResponse<CollectionRead>>("/storefront/collections", {
    params,
  });
  return data;
}

export async function getProductTypes(
  params: { page?: number; page_size?: number } = {},
): Promise<PaginatedResponse<ProductTypeRead>> {
  const { data } = await apiClient.get<PaginatedResponse<ProductTypeRead>>(
    "/storefront/product-types",
    { params },
  );
  return data;
}

export async function getProductLabels(): Promise<PaginatedResponse<ProductLabelRead>> {
  const { data } = await apiClient.get<PaginatedResponse<ProductLabelRead>>(
    "/storefront/product-labels",
    { params: { page_size: 100 } },
  );
  return data;
}

export async function listProducts(
  params: ProductListParams,
): Promise<PaginatedResponse<ProductListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<ProductListItem>>("/storefront/products", {
    params,
  });
  return data;
}

export async function getProductFilters(params: {
  category_id?: string;
  product_type_id?: string;
}): Promise<CatalogFiltersResponse> {
  const { data } = await apiClient.get<CatalogFiltersResponse>("/storefront/products/filters", {
    params,
  });
  return data;
}

export async function getProduct(id: string): Promise<ProductRead> {
  const { data } = await apiClient.get<ProductRead>(`/storefront/products/${id}`);
  return data;
}

export async function getProductDetail(id: string): Promise<ProductDetailResponse> {
  const { data } = await apiClient.get<ProductDetailResponse>(`/storefront/products/${id}/detail`);
  return data;
}
