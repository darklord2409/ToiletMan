import { Button, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UnorderedListOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { AttributeSet } from "@/types/entities";

const hooks = createResourceHooks<AttributeSet>("/attribute-sets", "attribute-sets");

export default function AttributeSetsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`attributeSets.${key}`, { ns: "catalog" });
  const navigate = useNavigate();

  const columns: ColumnsType<AttributeSet> = [
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.description"), dataIndex: "description", ellipsis: true, render: (v: string | null) => v ?? "—" },
  ];

  const fields: FormFieldConfig[] = [
    { name: "code", label: tp("fields.code"), type: "text", required: true },
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "description", label: tp("fields.description"), type: "textarea" },
  ];

  return (
    <CrudPage<AttributeSet>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
      extraRowActions={(record) => (
        <Tooltip title={tp("actions.manage")} key="manage">
          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            aria-label={tp("actions.manage")}
            onClick={() => navigate(`/catalog/attribute-sets/${record.id}`)}
          />
        </Tooltip>
      )}
    />
  );
}
