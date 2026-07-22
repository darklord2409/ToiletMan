"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRegister } from "@/hooks/useAuth";
import { ClientApiError } from "@/lib/client/apiClient";
import { TextField } from "@/components/ui/TextField";
import type { Locale } from "@/i18n/locales";

export function RegisterForm({ locale }: { locale: Locale }) {
  const t = useTranslations("account");
  const register = useRegister();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await register.mutateAsync({ email, password, first_name: name || undefined });
      router.push(`/${locale}/account`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? String(err.detail ?? "Error") : "Error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField label={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
      <TextField
        label={t("email")}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label={t("password")}
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={register.isPending}
        className="w-full rounded-l bg-brand-button px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {t("submit")}
      </button>
      <p className="text-center text-sm text-ink-muted">
        {t("haveAccount")}{" "}
        <Link href={`/${locale}/login`} className="text-brand-light hover:underline">
          {t("loginTitle")}
        </Link>
      </p>
    </form>
  );
}
