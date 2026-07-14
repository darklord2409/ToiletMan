import { useEffect, useRef } from "react";
import { useSignal } from "@telegram-apps/sdk-react";

import { backButton, hapticFeedback, mainButton, themeParams } from "@/telegram/sdk";

export function useTelegramIsDark(): boolean {
  return useSignal(themeParams.isDark);
}

// Telegram Desktop's embedded WebView (confirmed on version 9.6) does not
// forward native mouse-wheel scroll to the page — touch/drag works fine on
// mobile clients and plain browsers, but desktop users get a page that looks
// frozen. Gated strictly to platform === "tdesktop" (read the same way as
// the boot diagnostics in telegram/sdk.ts) so every other client keeps its
// already-working native scroll untouched.
export function useTelegramDesktopWheelScrollFix(): void {
  useEffect(() => {
    const w = window as unknown as { Telegram?: { WebApp?: { platform?: string } } };
    if (w.Telegram?.WebApp?.platform !== "tdesktop") return;

    function handleWheel(event: WheelEvent) {
      window.scrollBy(0, event.deltaY);
    }
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);
}

export function useTelegramBackButton(visible: boolean, onBack: () => void): void {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!visible) {
      try {
        backButton.hide();
      } catch {
        // not mounted (outside Telegram) — nothing to hide
      }
      return;
    }

    try {
      backButton.show();
    } catch {
      return;
    }
    const handler = () => onBackRef.current();
    backButton.onClick(handler);
    return () => {
      try {
        backButton.offClick(handler);
      } catch {
        // ignore
      }
    };
  }, [visible]);
}

interface MainButtonOptions {
  text: string;
  visible: boolean;
  enabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

export function useTelegramMainButton(options: MainButtonOptions): void {
  const { text, visible, enabled = true, loading = false, onClick } = options;
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  });

  useEffect(() => {
    try {
      mainButton.setParams({
        text,
        isVisible: visible,
        isEnabled: enabled,
        isLoaderVisible: loading,
      });
    } catch {
      return;
    }
    const handler = () => onClickRef.current();
    mainButton.onClick(handler);
    return () => {
      try {
        mainButton.offClick(handler);
      } catch {
        // ignore
      }
    };
  }, [text, visible, enabled, loading]);

  useEffect(
    () => () => {
      try {
        mainButton.setParams({ isVisible: false });
      } catch {
        // ignore
      }
    },
    [],
  );
}

type HapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type HapticNotificationType = "error" | "success" | "warning";

export function useHaptics() {
  return {
    impact(style: HapticImpactStyle = "light") {
      try {
        hapticFeedback.impactOccurred(style);
      } catch {
        // outside Telegram — no-op
      }
    },
    notification(type: HapticNotificationType) {
      try {
        hapticFeedback.notificationOccurred(type);
      } catch {
        // outside Telegram — no-op
      }
    },
    selection() {
      try {
        hapticFeedback.selectionChanged();
      } catch {
        // outside Telegram — no-op
      }
    },
  };
}
