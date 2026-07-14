import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { CartItem } from "@/types/entities";

const hooks = createResourceHooks<CartItem>("/cart-items", "cart-items");

export default function CartItemsPage() {
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`cartItems.${key}`, { ns: "commerce" });

  const columns: ColumnsType<CartItem> = [
    { title: tp("columns.cartId"), dataIndex: "cart_id", ellipsis: true },
    { title: tp("columns.productId"), dataIndex: "product_id", ellipsis: true },
    { title: tp("columns.qty"), dataIndex: "quantity" },
    { title: tp("columns.unitPrice"), dataIndex: "unit_price", render: (v: string) => `$${v}` },
  ];

  const fields: FormFieldConfig[] = [
    {
      name: "cart_id",
      label: tp("fields.cart"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/carts", labelKey: "id" },
    },
    {
      name: "product_id",
      label: tp("fields.product"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/products", labelKey: "name" },
    },
    { name: "quantity", label: tp("fields.quantity"), type: "number", required: true },
    { name: "unit_price", label: tp("fields.unitPrice"), type: "decimal", required: true },
  ];

  return (
    <CrudPage<CartItem>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
