import { apiClient } from "@/api/client";
import type { FavoriteResponse } from "@/types/entities";

export async function listFavorites(): Promise<FavoriteResponse[]> {
  const { data } = await apiClient.get<FavoriteResponse[]>("/storefront/favorites");
  return data;
}

export async function addFavorite(productId: string): Promise<FavoriteResponse> {
  const { data } = await apiClient.post<FavoriteResponse>("/storefront/favorites", {
    product_id: productId,
  });
  return data;
}

export async function removeFavorite(productId: string): Promise<void> {
  await apiClient.delete(`/storefront/favorites/${productId}`);
}
