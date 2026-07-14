import { apiClient } from "@/api/client";
import type { PublicStoreSettings } from "@/types/entities";

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const { data } = await apiClient.get<PublicStoreSettings>("/settings/public");
  return data;
}
