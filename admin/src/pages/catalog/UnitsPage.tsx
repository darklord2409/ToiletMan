import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Unit } from "@/types/entities";

const hooks = createResourceHooks<Unit>("/units", "units");

export default function UnitsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`units.${key}`, { ns: "catalog" });

  const columns: ColumnsType<Unit> = [
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.symbol"), dataIndex: "symbol" },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? t("common:active") : t("common:inactive")}</Tag>
      ),
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "symbol", label: tp("fields.symbol"), type: "text", required: true },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
  ];

  return (
    <CrudPage<Unit>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
