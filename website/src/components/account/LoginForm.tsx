"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLogin } from "@/hooks/useAuth";
import { ClientApiError } from "@/lib/client/apiClient";
import { TextField } from "@/components/ui/TextField";
import type { Locale } from "@/i18n/locales";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = useTranslations("account");
  const login = useLogin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email, password });
      router.push(searchParams.get("next") || `/${locale}/account`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? String(err.detail ?? "Error") : "Error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={login.isPending}
        className="w-full rounded-l bg-brand px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:bg-brand-dark"
      >
        {t("submit")}
      </button>
      <p className="text-center text-sm text-slate-500">
        {t("noAccount")}{" "}
        <Link href={`/${locale}/register`} className="text-brand hover:underline dark:text-brand-dark">
          {t("registerTitle")}
        </Link>
      </p>
    </form>
  );
}
