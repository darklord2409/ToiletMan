import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  [key: string]: unknown;
}

type EntityWithId = { id: string };

function snapshotLists<TEntity>(queryClient: QueryClient, resourceKey: string) {
  return queryClient.getQueriesData<PaginatedResponse<TEntity>>({ queryKey: [resourceKey, "list"] });
}

function rollbackLists<TEntity>(
  queryClient: QueryClient,
  snapshot: ReturnType<typeof snapshotLists<TEntity>>,
) {
  snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

/**
 * Builds the standard list/get/create/update/delete TanStack Query hooks
 * for one REST resource. Mirrors the backend's BaseRepository/BaseService
 * generics so entity pages stay thin instead of re-implementing fetch
 * logic per screen.
 *
 * Update/delete apply optimistically to every cached list page for this
 * resource (there can be several, one per filter/sort/page combination) so
 * the table reacts instantly instead of waiting on the round-trip; a failed
 * request rolls the cache back to its pre-mutation snapshot. Create isn't
 * optimistic — a fabricated row would land in the wrong sort/page position
 * until the server responds anyway, so it just invalidates on success.
 */
export function createResourceHooks<
  TEntity extends EntityWithId,
  TCreate = Partial<TEntity>,
  TUpdate = Partial<TEntity>,
>(endpoint: string, resourceKey: string) {
  function useList(params: ListParams = {}) {
    return useQuery({
      queryKey: [resourceKey, "list", params],
      queryFn: async () => {
        const { data } = await apiClient.get<PaginatedResponse<TEntity>>(endpoint, { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });
  }

  function useGet(id: string | undefined) {
    return useQuery({
      queryKey: [resourceKey, "detail", id],
      queryFn: async () => {
        const { data } = await apiClient.get<TEntity>(`${endpoint}/${id}`);
        return data;
      },
      enabled: Boolean(id),
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (payload: TCreate) => {
        const { data } = await apiClient.post<TEntity>(endpoint, payload);
        return data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [resourceKey, "list"] }),
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: TUpdate }) => {
        const { data } = await apiClient.patch<TEntity>(`${endpoint}/${id}`, payload);
        return data;
      },
      onMutate: async ({ id, payload }) => {
        await queryClient.cancelQueries({ queryKey: [resourceKey, "list"] });
        await queryClient.cancelQueries({ queryKey: [resourceKey, "detail", id] });

        const previousLists = snapshotLists<TEntity>(queryClient, resourceKey);
        const previousDetail = queryClient.getQueryData<TEntity>([resourceKey, "detail", id]);

        queryClient.setQueriesData<PaginatedResponse<TEntity>>({ queryKey: [resourceKey, "list"] }, (old) =>
          old
            ? {
                ...old,
                items: old.items.map((item) => (item.id === id ? { ...item, ...payload } : item)),
              }
            : old,
        );
        if (previousDetail) {
          queryClient.setQueryData([resourceKey, "detail", id], { ...previousDetail, ...payload });
        }

        return { previousLists, previousDetail, id };
      },
      onError: (_err, _vars, context) => {
        if (!context) return;
        rollbackLists(queryClient, context.previousLists);
        if (context.previousDetail) {
          queryClient.setQueryData([resourceKey, "detail", context.id], context.previousDetail);
        }
      },
      onSettled: (_data, _err, variables) => {
        queryClient.invalidateQueries({ queryKey: [resourceKey, "list"] });
        queryClient.invalidateQueries({ queryKey: [resourceKey, "detail", variables.id] });
      },
    });
  }

  function useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await apiClient.delete(`${endpoint}/${id}`);
      },
      onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: [resourceKey, "list"] });
        const previousLists = snapshotLists<TEntity>(queryClient, resourceKey);

        queryClient.setQueriesData<PaginatedResponse<TEntity>>({ queryKey: [resourceKey, "list"] }, (old) =>
          old
            ? {
                ...old,
                items: old.items.filter((item) => item.id !== id),
                meta: { ...old.meta, total_items: Math.max(0, old.meta.total_items - 1) },
              }
            : old,
        );

        return { previousLists };
      },
      onError: (_err, _id, context) => {
        if (context) rollbackLists(queryClient, context.previousLists);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: [resourceKey, "list"] }),
    });
  }

  return { useList, useGet, useCreate, useUpdate, useDelete, resourceKey };
}
