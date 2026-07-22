"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client/apiClient";
import type { CheckoutRequest, OrderDetail, PaginatedResponse, Order } from "@/types/api";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient.get<PaginatedResponse<Order>>("/orders"),
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => apiClient.get<OrderDetail>(`/orders/${orderId}`),
    enabled: Boolean(orderId),
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutRequest) => apiClient.post<OrderDetail>("/checkout", payload),
    onSuccess: () => {
      queryClient.setQueryData(["cart"], undefined);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
