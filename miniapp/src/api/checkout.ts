import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { CheckoutRequest, OrderDetailResponse, OrderRead } from "@/types/entities";

export async function checkout(payload: CheckoutRequest): Promise<OrderDetailResponse> {
  const { data } = await apiClient.post<OrderDetailResponse>("/storefront/checkout", payload);
  return data;
}

export async function listMyOrders(
  params: { page?: number; page_size?: number } = {},
): Promise<PaginatedResponse<OrderRead>> {
  const { data } = await apiClient.get<PaginatedResponse<OrderRead>>("/storefront/orders", {
    params,
  });
  return data;
}

export async function getMyOrder(orderId: string): Promise<OrderDetailResponse> {
  const { data } = await apiClient.get<OrderDetailResponse>(`/storefront/orders/${orderId}`);
  return data;
}
