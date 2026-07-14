import { cloudStorage } from "@telegram-apps/sdk-react";

function cloudAvailable(): boolean {
  try {
    return cloudStorage.isSupported();
  } catch {
    return false;
  }
}

// Telegram CloudStorage syncs small key/value pairs across a customer's
// devices (same Telegram account); localStorage is the single-device
// fallback used outside Telegram (plain browser, e2e tests) and also the
// value read synchronously on first paint so the UI never flashes a
// default theme/language before the (inherently async) Cloud read resolves.
export const kvStorage = {
  getLocal(key: string): string | null {
    return localStorage.getItem(key);
  },

  setLocal(key: string, value: string): void {
    localStorage.setItem(key, value);
    if (cloudAvailable()) {
      void cloudStorage.setItem(key, value).catch(() => undefined);
    }
  },

  removeLocal(key: string): void {
    localStorage.removeItem(key);
    if (cloudAvailable()) {
      void cloudStorage.deleteItem(key).catch(() => undefined);
    }
  },

  // Best-effort cross-device reconciliation: if the Telegram account has a
  // stored value that differs from what's on this device, adopt it. Safe to
  // call fire-and-forget right after boot.
  async reconcileFromCloud(key: string, onDivergence: (cloudValue: string) => void): Promise<void> {
    if (!cloudAvailable()) return;
    try {
      const cloudValue = await cloudStorage.getItem(key);
      if (cloudValue && cloudValue !== localStorage.getItem(key)) {
        onDivergence(cloudValue);
      }
    } catch {
      // CloudStorage unavailable/denied — localStorage remains authoritative.
    }
  },
};
