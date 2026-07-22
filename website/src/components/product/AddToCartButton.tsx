"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAddToCart } from "@/hooks/useCart";
import { ClientApiError } from "@/lib/client/apiClient";

export function AddToCartButton({
  productId,
  label,
  disabled,
  locale,
}: {
  productId: string;
  label: string;
  disabled?: boolean;
  locale: string;
}) {
  const addToCart = useAddToCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const handleClick = async () => {
    try {
      await addToCart.mutateAsync({ product_id: productId, quantity: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 401) {
        router.push(`/${locale}/login?next=/${locale}/cart`);
        return;
      }
      throw error;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || addToCart.isPending}
      className="mt-6 inline-flex items-center rounded-l bg-brand px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:bg-brand-dark"
    >
      {added ? "✓" : label}
    </button>
  );
}
