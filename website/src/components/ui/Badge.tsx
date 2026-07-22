import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "danger" | "muted";
}) {
  const toneClasses = {
    brand: "bg-brand text-white",
    danger: "bg-red-600 text-white",
    muted: "bg-box text-slate-500 dark:bg-box-dark dark:text-slate-300",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${toneClasses}`}>
      {children}
    </span>
  );
}
