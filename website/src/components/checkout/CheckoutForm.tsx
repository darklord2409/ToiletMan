"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMe } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useCheckout } from "@/hooks/useOrders";
import { formatMoney } from "@/lib/format";
import { TextField } from "@/components/ui/TextField";
import { ClientApiError } from "@/lib/client/apiClient";
import type { DeliveryMethod } from "@/types/api";
import type { Locale } from "@/i18n/locales";

export function CheckoutForm({ locale }: { locale: Locale }) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const cart = useCart();
  const checkout = useCheckout();

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meLoading && !me) {
      router.replace(`/${locale}/login?next=/${locale}/checkout`);
    }
  }, [me, meLoading, locale, router]);

  if (meLoading || !me) return <p className="text-slate-400">…</p>;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const order = await checkout.mutateAsync({
        contact_name: contactName,
        contact_phone: contactPhone,
        delivery_method: deliveryMethod,
        address: deliveryMethod === "delivery" ? address : undefined,
        comment: comment || undefined,
      });
      router.push(`/${locale}/account/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ClientApiError ? String(err.detail ?? "Error") : "Error");
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("checkoutTitle")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("contactName")}
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <TextField
          label={t("contactPhone")}
          required
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600 dark:text-slate-300">
            {t("deliveryMethod")}
          </span>
          <select
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
            className="w-full rounded-l border border-box bg-white px-3 py-2 dark:border-box-dark dark:bg-box-dark"
          >
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>
        {deliveryMethod === "delivery" ? (
          <TextField
            label={t("address")}
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600 dark:text-slate-300">{t("comment")}</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-l border border-box bg-white px-3 py-2 dark:border-box-dark dark:bg-box-dark"
          />
        </label>

        <div className="flex items-center justify-between border-t border-box pt-4 text-lg font-bold dark:border-box-dark">
          <span>{t("subtotal")}</span>
          <span>{formatMoney(cart.data?.subtotal ?? "0")}</span>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={checkout.isPending || !cart.data?.items.length}
          className="w-full rounded-l bg-brand py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:bg-brand-dark"
        >
          {t("placeOrder")}
        </button>
      </form>
    </div>
  );
}
