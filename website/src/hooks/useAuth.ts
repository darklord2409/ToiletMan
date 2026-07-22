"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ClientApiError } from "@/lib/client/apiClient";
import type { Customer } from "@/types/api";

const ME_KEY = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await apiClient.get<Customer>("/me");
      } catch (error) {
        if (error instanceof ClientApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      apiClient.post<{ ok: true }>("/auth/login", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      first_name?: string;
      last_name?: string;
    }) => apiClient.post<{ ok: true }>("/auth/register", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ ok: true }>("/auth/logout"),
    onSuccess: () => queryClient.setQueryData(ME_KEY, null),
  });
}
