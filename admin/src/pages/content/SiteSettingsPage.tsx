import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { SiteSetting } from "@/types/entities";

const hooks = createResourceHooks<SiteSetting>("/site-settings", "site-settings");

export default function SiteSettingsPage() {
  const { t } = useTranslation(["content", "common"]);
  const tp = (key: string) => t(`siteSettings.${key}`, { ns: "content" });

  const columns: ColumnsType<SiteSetting> = [
    { title: tp("columns.key"), dataIndex: "key", sorter: true },
    { title: tp("columns.value"), dataIndex: "value", render: (v: unknown) => (v ? JSON.stringify(v) : "—") },
    { title: tp("columns.description"), dataIndex: "description", ellipsis: true },
  ];

  const fields: FormFieldConfig[] = [
    { name: "key", label: tp("fields.key"), type: "text", required: true },
    { name: "value", label: tp("fields.value"), type: "json" },
    { name: "description", label: tp("fields.description"), type: "textarea" },
  ];

  return (
    <CrudPage<SiteSetting>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
