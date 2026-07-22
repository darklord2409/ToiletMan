"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOrder } from "@/hooks/useOrders";
import { formatMoney } from "@/lib/format";
import type { Locale } from "@/i18n/locales";

export function OrderDetailView({ locale, orderId }: { locale: Locale; orderId: string }) {
  const t = useTranslations("account");
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) return <p className="text-slate-400">…</p>;
  if (!order) return <p className="text-slate-400">—</p>;

  return (
    <div>
      <Link href={`/${locale}/account`} className="mb-4 inline-block text-sm text-brand hover:underline dark:text-brand-dark">
        ← {t("myOrders")}
      </Link>
      <h1 className="mb-1 text-2xl font-bold">{t("orderNumber", { number: order.order_number })}</h1>
      <p className="mb-6 text-sm text-slate-400">{order.status}</p>

      <ul className="divide-y divide-box dark:divide-box-dark">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{item.product_name}</p>
              <p className="text-sm text-slate-400">
                {item.quantity} × {formatMoney(item.unit_price, order.currency)}
              </p>
            </div>
            <div className="font-semibold">{formatMoney(item.line_total, order.currency)}</div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-box pt-4 text-lg font-bold dark:border-box-dark">
        <span>{t("myOrders")}</span>
        <span>{formatMoney(order.grand_total, order.currency)}</span>
      </div>
    </div>
  );
}
