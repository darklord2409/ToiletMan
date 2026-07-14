import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from "@/api/cart";
import { useAuth } from "@/auth/AuthContext";

export const CART_QUERY_KEY = ["cart"] as const;

export function useCart() {
  const { status } = useAuth();
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCart,
    enabled: status === "authenticated",
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      addCartItem(productId, quantity),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCart,
    onSuccess: (data) => queryClient.setQueryData(CART_QUERY_KEY, data),
  });
}
