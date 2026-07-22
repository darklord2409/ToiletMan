import type { InputHTMLAttributes } from "react";

export function TextField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink-muted">{label}</span>
      <input
        {...props}
        className="w-full rounded-l border border-line bg-box px-3 py-2 text-ink placeholder:text-ink-muted/60 focus:border-brand focus:outline-none"
      />
    </label>
  );
}
