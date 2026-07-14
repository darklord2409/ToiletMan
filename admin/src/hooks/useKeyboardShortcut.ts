import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)
  );
}

/**
 * Fires `handler` when `key` (a single lowercase letter, matched
 * case-insensitively) is pressed with no modifier keys, unless focus is
 * currently inside a text input/textarea/select — so typing "n" into a
 * product SKU field doesn't pop the create modal.
 */
export function useKeyboardShortcut(key: string, handler: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        handler();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, handler, enabled]);
}
