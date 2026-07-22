import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "danger" | "muted";
}) {
  const toneClasses = {
    brand: "bg-brand-button text-white",
    danger: "bg-red-600 text-white",
    muted: "bg-box text-ink-muted",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${toneClasses}`}>
      {children}
    </span>
  );
}
