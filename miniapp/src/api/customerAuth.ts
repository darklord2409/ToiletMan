import { apiClient } from "@/api/client";
import type { TokenPair } from "@/types/api";
import type { CustomerRead } from "@/types/entities";

export async function loginWithTelegram(initData: string): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>("/customer-auth/telegram", {
    init_data: initData,
  });
  return data;
}

export async function getMe(): Promise<CustomerRead> {
  const { data } = await apiClient.get<CustomerRead>("/customer-auth/me");
  return data;
}

export async function updateMyLanguage(language: string): Promise<CustomerRead> {
  const { data } = await apiClient.patch<CustomerRead>("/customer-auth/me/language", { language });
  return data;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  notifications_enabled?: boolean;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<CustomerRead> {
  const { data } = await apiClient.patch<CustomerRead>("/customer-auth/me", payload);
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post("/customer-auth/logout", { refresh_token: refreshToken });
}
