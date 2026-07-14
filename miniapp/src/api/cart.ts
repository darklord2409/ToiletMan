import { apiClient } from "@/api/client";
import type { CartResponse } from "@/types/entities";

export async function getCart(): Promise<CartResponse> {
  const { data } = await apiClient.get<CartResponse>("/storefront/cart");
  return data;
}

export async function addCartItem(productId: string, quantity: number): Promise<CartResponse> {
  const { data } = await apiClient.post<CartResponse>("/storefront/cart/items", {
    product_id: productId,
    quantity,
  });
  return data;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
  const { data } = await apiClient.patch<CartResponse>(`/storefront/cart/items/${itemId}`, {
    quantity,
  });
  return data;
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  const { data } = await apiClient.delete<CartResponse>(`/storefront/cart/items/${itemId}`);
  return data;
}

export async function clearCart(): Promise<CartResponse> {
  const { data } = await apiClient.delete<CartResponse>("/storefront/cart");
  return data;
}
