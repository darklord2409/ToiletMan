import {
  backButton,
  cloudStorage,
  hapticFeedback,
  init as initTelegramSdk,
  initData,
  mainButton,
  requestContact,
  themeParams,
  viewport,
} from "@telegram-apps/sdk-react";

export interface TelegramBootResult {
  isTelegram: boolean;
}

function safeMount(mount: () => unknown): void {
  try {
    const result = mount();
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      (result as Promise<unknown>).catch(() => undefined);
    }
  } catch {
    // Component unsupported on this Telegram client version, or we're not
    // running inside Telegram at all — degrade silently either way.
  }
}

let bootPromise: Promise<TelegramBootResult> | null = null;

async function boot(): Promise<TelegramBootResult> {
  try {
    // init() retrieves and parses Telegram's launch params; it throws when
    // none are present, which is exactly the "opened in a plain browser"
    // case (Playwright e2e included) — the whole app must keep working
    // then, just without native Telegram chrome.
    initTelegramSdk();
  } catch {
    return { isTelegram: false };
  }

  safeMount(() => backButton.mount());
  safeMount(() => mainButton.mount());
  safeMount(() => themeParams.mount());
  safeMount(() => viewport.mount());
  safeMount(() => initData.restore());
  try {
    viewport.expand();
    viewport.bindCssVars();
  } catch {
    // best-effort — not every client supports fullscreen expansion / vars
  }

  return { isTelegram: true };
}

export function bootTelegramSdk(): Promise<TelegramBootResult> {
  bootPromise ??= boot();
  return bootPromise;
}

export function getRawInitData(): string | undefined {
  try {
    return initData.raw();
  } catch {
    return undefined;
  }
}

// Prompts Telegram's own native "share your phone number?" dialog — never
// silent, Telegram doesn't allow reading the phone number without the user
// explicitly confirming this exact prompt. Returns undefined on decline, on
// clients that don't support it (pre-6.9), or outside Telegram entirely.
export async function requestUserPhone(): Promise<string | undefined> {
  try {
    if (!requestContact.isAvailable()) return undefined;
    const result = await requestContact();
    return result.contact.phone_number;
  } catch {
    return undefined;
  }
}

export function isPhoneRequestAvailable(): boolean {
  try {
    return requestContact.isAvailable();
  } catch {
    return false;
  }
}

export { backButton, mainButton, hapticFeedback, viewport, themeParams, cloudStorage, initData };
