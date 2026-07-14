import { App, Button, Popconfirm } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient, extractErrorMessage } from "@/api/client";
import { CrudPage } from "@/components/CrudPage";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { PriceHistory } from "@/types/entities";

const hooks = createResourceHooks<PriceHistory>("/price-history", "price-history");

export default function PriceHistoryPage() {
  const { t } = useTranslation(["system", "common"]);
  const tp = (key: string, opts?: Record<string, unknown>) =>
    t(`priceHistory.${key}`, { ns: "system", ...opts });
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const rollbackMutation = useMutation({
    mutationFn: async (record: PriceHistory) => {
      await apiClient.post(`/products/${record.product_id}/price-rollback`, {
        price_history_id: record.id,
      });
    },
    onSuccess: () => {
      message.success(tp("rollbackSuccess"));
      queryClient.invalidateQueries({ queryKey: ["price-history", "list"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  const columns: ColumnsType<PriceHistory> = [
    { title: tp("columns.productId"), dataIndex: "product_id", ellipsis: true },
    { title: tp("columns.oldPrice"), dataIndex: "old_price", render: (v: string) => `$${v}` },
    { title: tp("columns.newPrice"), dataIndex: "new_price", render: (v: string) => `$${v}` },
    { title: tp("columns.reason"), dataIndex: "reason" },
    {
      title: tp("columns.when"),
      dataIndex: "created_at",
      sorter: true,
      render: (v: string) => new Date(v).toLocaleString(),
    },
  ];

  return (
    <CrudPage<PriceHistory>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={[]}
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
      extraRowActions={(record) => (
        <Popconfirm
          key="rollback"
          title={tp("confirmRollback")}
          description={tp("confirmRollbackDescription", { price: record.old_price })}
          onConfirm={() => rollbackMutation.mutate(record)}
        >
          <Button size="small" icon={<RedoOutlined />} loading={rollbackMutation.isPending}>
            {tp("actions.rollback")}
          </Button>
        </Popconfirm>
      )}
    />
  );
}
