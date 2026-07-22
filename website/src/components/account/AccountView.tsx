"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLogout, useMe } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { formatMoney } from "@/lib/format";
import type { Locale } from "@/i18n/locales";

export function AccountView({ locale }: { locale: Locale }) {
  const t = useTranslations("account");
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const orders = useOrders();
  const logout = useLogout();

  useEffect(() => {
    if (!meLoading && !me) {
      router.replace(`/${locale}/login?next=/${locale}/account`);
    }
  }, [me, meLoading, locale, router]);

  if (meLoading || !me) return <p className="text-ink-muted">…</p>;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {me.first_name || me.email || me.phone}
          </h1>
          {me.email ? <p className="text-sm text-ink-muted">{me.email}</p> : null}
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout.mutateAsync();
            router.push(`/${locale}`);
            router.refresh();
          }}
          className="text-sm text-red-500 hover:underline"
        >
          {t("logout")}
        </button>
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t("myOrders")}</h2>
      <ul className="divide-y divide-line">
        {(orders.data?.items ?? []).map((order) => (
          <li key={order.id}>
            <Link
              href={`/${locale}/account/orders/${order.id}`}
              className="flex items-center justify-between py-3 hover:text-brand-light"
            >
              <span>{t("orderNumber", { number: order.order_number })}</span>
              <span className="font-semibold">{formatMoney(order.grand_total, order.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
