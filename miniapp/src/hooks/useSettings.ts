import { useQuery } from "@tanstack/react-query";

import { getPublicStoreSettings } from "@/api/settings";

export function usePublicStoreSettings() {
  return useQuery({
    queryKey: ["public-store-settings"],
    queryFn: getPublicStoreSettings,
    staleTime: 5 * 60 * 1000,
  });
}
