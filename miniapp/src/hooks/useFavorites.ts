import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addFavorite, listFavorites, removeFavorite } from "@/api/favorites";
import { useAuth } from "@/auth/AuthContext";

export const FAVORITES_QUERY_KEY = ["favorites"] as const;

export function useFavorites() {
  const { status } = useAuth();
  return useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: listFavorites,
    enabled: status === "authenticated",
  });
}

export function useIsFavorite(productId: string | undefined): boolean {
  const { data } = useFavorites();
  if (!productId || !data) return false;
  return data.some((favorite) => favorite.product.id === productId);
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { data: favorites } = useFavorites();

  return useMutation({
    mutationFn: async (productId: string) => {
      const isFavorite = favorites?.some((favorite) => favorite.product.id === productId) ?? false;
      if (isFavorite) {
        await removeFavorite(productId);
      } else {
        await addFavorite(productId);
      }
      return !isFavorite;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY }),
  });
}
