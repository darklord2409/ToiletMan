import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { updateMyLanguage, updateMyProfile, type UpdateProfilePayload } from "@/api/customerAuth";
import { useAuth } from "@/auth/AuthContext";

export const CUSTOMER_QUERY_KEY = ["customer", "me"] as const;

export function useCustomer() {
  const { customer, status } = useAuth();
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEY,
    queryFn: async () => customer,
    initialData: customer,
    enabled: status === "authenticated",
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setCustomer } = useAuth();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateMyProfile(payload),
    onSuccess: (customer) => {
      setCustomer(customer);
      queryClient.setQueryData(CUSTOMER_QUERY_KEY, customer);
    },
  });
}

export function useUpdateLanguage() {
  const queryClient = useQueryClient();
  const { setCustomer } = useAuth();
  return useMutation({
    mutationFn: (language: string) => updateMyLanguage(language),
    onSuccess: (customer) => {
      setCustomer(customer);
      queryClient.setQueryData(CUSTOMER_QUERY_KEY, customer);
    },
  });
}
