"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/useCart";
import { useMe } from "@/hooks/useAuth";
import { absoluteMediaUrl } from "@/lib/media";
import { formatMoney } from "@/lib/format";
import { ClientApiError } from "@/lib/client/apiClient";
import type { Locale } from "@/i18n/locales";

export function CartView({ locale }: { locale: Locale }) {
  const t = useTranslations("checkout");
  const { data: me, isLoading: meLoading } = useMe();
  const cart = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  if (meLoading || cart.isLoading) {
    return <p className="text-slate-400">…</p>;
  }

  if (!me) {
    return (
      <div className="rounded-l bg-box p-8 text-center dark:bg-box-dark">
        <p className="mb-4">{t("emptyCart")}</p>
        <Link
          href={`/${locale}/login?next=/${locale}/cart`}
          className="rounded-l bg-brand px-4 py-2 font-semibold text-white dark:bg-brand-dark"
        >
          {locale === "ru" ? "Войти" : locale === "uz" ? "Kirish" : "Log in"}
        </Link>
      </div>
    );
  }

  if (cart.isError && cart.error instanceof ClientApiError && cart.error.status === 401) {
    return <p className="text-slate-400">{t("emptyCart")}</p>;
  }

  const items = cart.data?.items ?? [];

  if (items.length === 0) {
    return <p className="py-10 text-center text-slate-400">{t("emptyCart")}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("cartTitle")}</h1>
      <ul className="divide-y divide-box dark:divide-box-dark">
        {items.map((item) => {
          const image = absoluteMediaUrl(item.product.primary_image_url);
          return (
            <li key={item.id} className="flex items-center gap-4 py-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-l bg-box dark:bg-box-dark">
                {image ? <Image src={image} alt={item.product.name} fill sizes="64px" className="object-cover" /> : null}
              </div>
              <div className="flex-1">
                <Link href={`/${locale}/product/${item.product.slug}`} className="font-medium hover:underline">
                  {item.product.name}
                </Link>
                <div className="mt-1 flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    {t("quantity")}
                    <input
                      type="number"
                      min={1}
                      defaultValue={item.quantity}
                      onBlur={(e) => {
                        const quantity = Number(e.target.value);
                        if (quantity >= 1 && quantity !== item.quantity) {
                          updateItem.mutate({ itemId: item.id, quantity });
                        }
                      }}
                      className="w-16 rounded border border-box bg-white px-2 py-1 dark:border-box-dark dark:bg-box-dark"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem.mutate(item.id)}
                    className="text-red-500 hover:underline"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
              <div className="font-semibold">{formatMoney(item.line_total)}</div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-box pt-4 text-lg font-bold dark:border-box-dark">
        <span>{t("subtotal")}</span>
        <span>{formatMoney(cart.data?.subtotal ?? "0")}</span>
      </div>

      <Link
        href={`/${locale}/checkout`}
        className="mt-6 block w-full rounded-l bg-brand py-3 text-center font-semibold text-white hover:opacity-90 dark:bg-brand-dark"
      >
        {t("checkoutTitle")}
      </Link>
    </div>
  );
}
