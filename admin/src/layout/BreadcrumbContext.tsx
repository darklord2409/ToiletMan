import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface BreadcrumbContextValue {
  extra: string | null;
  setExtra: (value: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<string | null>(null);
  const value = useMemo(() => ({ extra, setExtra }), [extra]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

function useBreadcrumbContext(): BreadcrumbContextValue {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error("useBreadcrumbContext must be used within BreadcrumbProvider");
  return ctx;
}

/** Pages with a dynamic title (e.g. a product editor showing its SKU, or
 * "New product") call this to append a trailing breadcrumb/tab-title
 * segment beyond what the static nav config can express. */
export function useBreadcrumbExtra(value: string | null | undefined): void {
  const { setExtra } = useBreadcrumbContext();
  useEffect(() => {
    setExtra(value ?? null);
    return () => setExtra(null);
  }, [value, setExtra]);
}

export function useBreadcrumbExtraValue(): string | null {
  return useBreadcrumbContext().extra;
}
