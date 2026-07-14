import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useBreadcrumbExtraValue } from "@/layout/BreadcrumbContext";
import { dashboardNavItem, navGroups } from "@/layout/navConfig";

export interface OpenTab {
  path: string;
  labelKey: string;
  extra?: string | null;
  /** Unpinned tabs are "preview" tabs (VS Code/JetBrains-style): at most one
   * exists at a time, and navigating to a not-yet-open page reuses it in
   * place instead of piling up a new permanent tab. Pinning promotes a tab
   * so it survives further navigation. */
  pinned?: boolean;
}

const STORAGE_KEY = "tipobot_open_tabs";

function findNavLabelKey(pathname: string): string | null {
  if (pathname === dashboardNavItem.path) return dashboardNavItem.labelKey;
  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return item.labelKey;
    }
  }
  return null;
}

function loadStoredTabs(): OpenTab[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OpenTab[]) : [];
  } catch {
    return [];
  }
}

interface OpenTabsContextValue {
  tabs: OpenTab[];
  activePath: string;
  closeTab: (path: string) => void;
  togglePin: (path: string) => void;
}

const OpenTabsContext = createContext<OpenTabsContextValue | undefined>(undefined);

/** Tracks which pages are "open" (browser/IDE-style tab bar), persisted
 * per browser tab via sessionStorage so a reload doesn't lose them. Must
 * be mounted inside the router (uses useLocation/useNavigate) and inside
 * BreadcrumbProvider (reads the same "extra" title pages set for
 * themselves, e.g. a product's SKU, to keep the tab label in sync). */
export function OpenTabsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const extra = useBreadcrumbExtraValue();
  const [tabs, setTabs] = useState<OpenTab[]>(loadStoredTabs);

  // Opens/updates a tab for the current route whenever the path or its
  // breadcrumb "extra" title changes — tracked during render (React's
  // "adjusting state when a prop changes" pattern) instead of in an effect,
  // since this reacts to two independently-changing inputs.
  const [trackedPath, setTrackedPath] = useState(location.pathname);
  const [trackedExtra, setTrackedExtra] = useState(extra);
  if (location.pathname !== trackedPath || extra !== trackedExtra) {
    setTrackedPath(location.pathname);
    setTrackedExtra(extra);
    const labelKey = findNavLabelKey(location.pathname);
    if (labelKey) {
      setTabs((prev) => {
        const existingIndex = prev.findIndex((tab) => tab.path === location.pathname);
        if (existingIndex !== -1) {
          if (prev[existingIndex].extra === extra) return prev;
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], extra };
          return next;
        }

        // No tab open for this path yet — reuse the single "preview" tab
        // (the one unpinned, non-dashboard tab, if any) in place rather
        // than always appending a new permanent one, so just clicking
        // around the nav doesn't pile up tabs. A pinned tab is never
        // touched by this.
        const newTab: OpenTab = { path: location.pathname, labelKey, extra, pinned: false };
        const previewIndex = prev.findIndex(
          (tab) => !tab.pinned && tab.path !== dashboardNavItem.path,
        );
        if (previewIndex === -1) return [...prev, newTab];
        const next = [...prev];
        next[previewIndex] = newTab;
        return next;
      });
    }
  }

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const index = prev.findIndex((tab) => tab.path === path);
        if (index === -1) return prev;
        const next = prev.filter((tab) => tab.path !== path);
        if (location.pathname === path) {
          const fallback = next[index - 1] ?? next[0];
          navigate(fallback ? fallback.path : dashboardNavItem.path);
        }
        return next;
      });
    },
    [location.pathname, navigate],
  );

  const togglePin = useCallback((path: string) => {
    setTabs((prev) => prev.map((tab) => (tab.path === path ? { ...tab, pinned: !tab.pinned } : tab)));
  }, []);

  const value = useMemo(
    () => ({ tabs, activePath: location.pathname, closeTab, togglePin }),
    [tabs, location.pathname, closeTab, togglePin],
  );

  return <OpenTabsContext.Provider value={value}>{children}</OpenTabsContext.Provider>;
}

export function useOpenTabs(): OpenTabsContextValue {
  const ctx = useContext(OpenTabsContext);
  if (!ctx) throw new Error("useOpenTabs must be used within OpenTabsProvider");
  return ctx;
}
