import { kvStorage } from "@/lib/storage";

const STORAGE_KEY = "tipobot_search_history";
const MAX_ITEMS = 10;

export function getSearchHistory(): string[] {
  const raw = kvStorage.getLocal(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function addSearchHistoryEntry(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = getSearchHistory().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_ITEMS);
  kvStorage.setLocal(STORAGE_KEY, JSON.stringify(next));
}

export function clearSearchHistory(): void {
  kvStorage.removeLocal(STORAGE_KEY);
}
