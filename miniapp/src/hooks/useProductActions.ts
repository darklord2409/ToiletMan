import { Toast } from "antd-mobile";
import { useTranslation } from "react-i18next";

import { useAddToCart } from "@/hooks/useCart";
import { useHaptics } from "@/telegram/hooks";

export function useAddToCartAction() {
  const { t } = useTranslation("common");
  const haptics = useHaptics();
  const mutation = useAddToCart();

  function addToCart(productId: string, quantity = 1) {
    mutation.mutate(
      { productId, quantity },
      {
        onSuccess: () => {
          haptics.notification("success");
          Toast.show({ content: t("toast.addedToCart"), position: "bottom" });
        },
        onError: () => {
          haptics.notification("error");
          Toast.show({ content: t("genericError"), position: "bottom" });
        },
      },
    );
  }

  return { addToCart, isPending: mutation.isPending };
}
