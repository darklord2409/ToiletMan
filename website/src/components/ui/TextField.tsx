import type { InputHTMLAttributes } from "react";

export function TextField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <input
        {...props}
        className="w-full rounded-l border border-box bg-white px-3 py-2 focus:border-brand focus:outline-none dark:border-box-dark dark:bg-box-dark dark:focus:border-brand-dark"
      />
    </label>
  );
}
