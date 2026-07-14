import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getMyOrder, listMyOrders } from "@/api/checkout";

export function useMyOrders() {
  return useInfiniteQuery({
    queryKey: ["orders"],
    queryFn: ({ pageParam }) => listMyOrders({ page: pageParam, page_size: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.total_pages ? lastPage.meta.page + 1 : undefined,
  });
}

export function useMyOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getMyOrder(orderId as string),
    enabled: Boolean(orderId),
  });
}
