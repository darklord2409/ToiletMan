"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client/apiClient";
import type { Cart } from "@/types/api";

const CART_KEY = ["cart"] as const;

export function useCart() {
  return useQuery({
    queryKey: CART_KEY,
    queryFn: () => apiClient.get<Cart>("/cart"),
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { product_id: string; quantity?: number }) =>
      apiClient.post<Cart>("/cart", payload),
    onSuccess: (cart) => queryClient.setQueryData(CART_KEY, cart),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiClient.patch<Cart>(`/cart/items/${itemId}`, { quantity }),
    onSuccess: (cart) => queryClient.setQueryData(CART_KEY, cart),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => apiClient.delete<Cart>(`/cart/items/${itemId}`),
    onSuccess: (cart) => queryClient.setQueryData(CART_KEY, cart),
  });
}
