import { useState } from "react";
import {
  App,
  Button,
  Checkbox,
  Dropdown,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import {
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  RedoOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { CrudPage } from "@/components/CrudPage";
import { ResourceSelect } from "@/components/EntityFormModal";
import { createResourceHooks } from "@/hooks/useCrudResource";
import { apiClient, extractErrorMessage } from "@/api/client";
import type { AvailabilityStatus, Product, ProductStatus } from "@/types/entities";

const hooks = createResourceHooks<Product>("/products", "products");

const statusColor: Record<ProductStatus, string> = {
  draft: "default",
  active: "green",
  archived: "red",
};

const availabilityColor: Record<AvailabilityStatus, string> = {
  in_stock: "green",
  low_stock: "gold",
  out_of_stock: "red",
  unlimited: "blue",
};

type BulkAction = "status" | "manufacturer" | "category" | "collection" | "price" | "delete";

const bulkTitleKey: Record<BulkAction, string> = {
  status: "bulk.changeStatus",
  manufacturer: "bulk.changeManufacturer",
  category: "bulk.changeCategory",
  collection: "bulk.changeCollection",
  price: "bulk.adjustPrice",
  delete: "bulk.delete",
};

interface ImportRowResult {
  row_number: number;
  sku: string | null;
  action: string;
  errors: string[];
}

interface ImportPreviewResponse {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  create_count: number;
  update_count: number;
  duplicate_skus_in_file: string[];
  rows: ImportRowResult[];
}

export default function ProductsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string, opts?: Record<string, unknown>) =>
    t(`products.${key}`, { ns: "catalog", ...opts });
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<ProductStatus | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkValue, setBulkValue] = useState<Record<string, unknown>>({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [cloneTarget, setCloneTarget] = useState<Product | null>(null);
  const [cloneValues, setCloneValues] = useState({ new_sku: "", new_slug: "", new_name: "" });

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"full" | "price_only" | "stock_only">("full");
  const [importAtomic, setImportAtomic] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewResponse | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  function refreshList() {
    queryClient.invalidateQueries({ queryKey: ["products", "list"] });
  }

  const statusOptions = [
    { label: t("common:productStatus.draft"), value: "draft" },
    { label: t("common:productStatus.active"), value: "active" },
    { label: t("common:productStatus.archived"), value: "archived" },
  ];

  // ------------------------------------------------------------------
  // Row actions: archive / restore / clone
  // ------------------------------------------------------------------

  async function handleArchive(product: Product) {
    try {
      await apiClient.post(`/products/${product.id}/archive`);
      message.success(tp("actions.archiveSuccess"));
      refreshList();
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  async function handleRestore(product: Product) {
    try {
      await apiClient.post(`/products/${product.id}/restore`);
      message.success(tp("actions.restoreSuccess"));
      refreshList();
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  function openClone(product: Product) {
    setCloneTarget(product);
    setCloneValues({ new_sku: `${product.sku}-copy`, new_slug: `${product.slug}-copy`, new_name: "" });
  }

  async function submitClone() {
    if (!cloneTarget) return;
    try {
      await apiClient.post(`/products/${cloneTarget.id}/clone`, {
        new_sku: cloneValues.new_sku,
        new_slug: cloneValues.new_slug,
        new_name: cloneValues.new_name || undefined,
      });
      message.success(tp("actions.cloneSuccess"));
      setCloneTarget(null);
      refreshList();
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  function renderRowActions(product: Product) {
    return (
      <Space size="small" key="extra">
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => navigate(`/catalog/products/${product.id}`)}
        />
        {product.status === "archived" ? (
          <Button size="small" icon={<RedoOutlined />} onClick={() => handleRestore(product)} />
        ) : (
          <Button size="small" icon={<InboxOutlined />} onClick={() => handleArchive(product)} />
        )}
        <Button size="small" icon={<CopyOutlined />} onClick={() => openClone(product)} />
      </Space>
    );
  }

  // ------------------------------------------------------------------
  // Bulk actions
  // ------------------------------------------------------------------

  const bulkMenuItems: MenuProps["items"] = [
    { key: "status", label: tp("bulk.changeStatus") },
    { key: "manufacturer", label: tp("bulk.changeManufacturer") },
    { key: "category", label: tp("bulk.changeCategory") },
    { key: "collection", label: tp("bulk.changeCollection") },
    { key: "price", label: tp("bulk.adjustPrice") },
    { type: "divider" },
    { key: "delete", label: tp("bulk.delete"), danger: true },
  ];

  function openBulkAction(key: string) {
    setBulkValue({});
    setBulkAction(key as BulkAction);
  }

  async function submitBulkAction() {
    if (!bulkAction || selectedIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      let endpoint = "";
      let payload: Record<string, unknown> = { product_ids: selectedIds };
      switch (bulkAction) {
        case "status":
          endpoint = "/products/bulk/status";
          payload = { ...payload, status: bulkValue.status };
          break;
        case "manufacturer":
          endpoint = "/products/bulk/manufacturer";
          payload = { ...payload, manufacturer_id: bulkValue.manufacturer_id ?? null };
          break;
        case "category":
          endpoint = "/products/bulk/category";
          payload = { ...payload, category_id: bulkValue.category_id };
          break;
        case "collection":
          endpoint = "/products/bulk/collection";
          payload = { ...payload, collection_id: bulkValue.collection_id ?? null };
          break;
        case "price":
          endpoint = "/products/bulk/price-adjust";
          payload = {
            ...payload,
            mode: bulkValue.mode ?? "percentage",
            direction: bulkValue.direction ?? "increase",
            value: bulkValue.value ?? 0,
          };
          break;
        case "delete":
          endpoint = "/products/bulk/delete";
          break;
      }
      const { data } = await apiClient.post<{ updated_count: number }>(endpoint, payload);
      message.success(tp("bulk.success", { count: data.updated_count }));
      setBulkAction(null);
      setSelectedIds([]);
      refreshList();
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setBulkSubmitting(false);
    }
  }

  function renderBulkModalBody() {
    switch (bulkAction) {
      case "status":
        return (
          <Select
            style={{ width: "100%" }}
            placeholder={tp("fields.status")}
            options={statusOptions}
            value={bulkValue.status as string | undefined}
            onChange={(v) => setBulkValue({ status: v })}
          />
        );
      case "manufacturer":
        return (
          <ResourceSelect
            resource={{ endpoint: "/manufacturers", labelKey: "name" }}
            value={bulkValue.manufacturer_id}
            onChange={(v) => setBulkValue({ manufacturer_id: v })}
          />
        );
      case "category":
        return (
          <ResourceSelect
            resource={{ endpoint: "/categories", labelKey: "name" }}
            value={bulkValue.category_id}
            onChange={(v) => setBulkValue({ category_id: v })}
          />
        );
      case "collection":
        return (
          <ResourceSelect
            resource={{ endpoint: "/collections", labelKey: "name" }}
            value={bulkValue.collection_id}
            onChange={(v) => setBulkValue({ collection_id: v })}
          />
        );
      case "price":
        return (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Radio.Group
              value={bulkValue.mode ?? "percentage"}
              onChange={(e) => setBulkValue((v) => ({ ...v, mode: e.target.value }))}
            >
              <Radio.Button value="percentage">{tp("bulk.percentage")}</Radio.Button>
              <Radio.Button value="fixed">{tp("bulk.fixed")}</Radio.Button>
            </Radio.Group>
            <Radio.Group
              value={bulkValue.direction ?? "increase"}
              onChange={(e) => setBulkValue((v) => ({ ...v, direction: e.target.value }))}
            >
              <Radio.Button value="increase">{tp("bulk.increase")}</Radio.Button>
              <Radio.Button value="decrease">{tp("bulk.decrease")}</Radio.Button>
            </Radio.Group>
            <InputNumber
              style={{ width: "100%" }}
              placeholder={tp("bulk.value")}
              value={bulkValue.value as number | undefined}
              onChange={(v) => setBulkValue((prev) => ({ ...prev, value: v }))}
            />
          </Space>
        );
      case "delete":
        return <Typography.Text>{tp("bulk.selectedCount", { count: selectedIds.length })}</Typography.Text>;
      default:
        return null;
    }
  }

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------

  async function handleExport(fmt: "csv" | "xlsx", onlySelected: boolean) {
    try {
      const params: Record<string, unknown> = { fmt };
      if (statusFilter) params.product_status = statusFilter;
      if (onlySelected && selectedIds.length > 0) params.product_ids = selectedIds.join(",");
      const response = await apiClient.get("/products/export", { params, responseType: "blob" });
      const blob = new Blob([response.data as BlobPart], {
        type: String(response.headers["content-type"] ?? "text/csv"),
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `products.${fmt}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  const exportMenuItems: MenuProps["items"] = [
    { key: "csv-all", label: tp("export.csvAll") },
    { key: "xlsx-all", label: tp("export.xlsxAll") },
    { type: "divider" },
    {
      key: "csv-selected",
      label: tp("export.csvSelected", { count: selectedIds.length }),
      disabled: selectedIds.length === 0,
    },
    {
      key: "xlsx-selected",
      label: tp("export.xlsxSelected", { count: selectedIds.length }),
      disabled: selectedIds.length === 0,
    },
  ];

  function handleExportMenuClick(key: string) {
    switch (key) {
      case "csv-all":
        return handleExport("csv", false);
      case "xlsx-all":
        return handleExport("xlsx", false);
      case "csv-selected":
        return handleExport("csv", true);
      case "xlsx-selected":
        return handleExport("xlsx", true);
    }
  }

  // ------------------------------------------------------------------
  // Import
  // ------------------------------------------------------------------

  async function handleImportPreview() {
    if (!importFile) return;
    setImportBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const { data } = await apiClient.post<ImportPreviewResponse>(
        "/products/import/preview",
        formData,
        { params: { mode: importMode } },
      );
      setImportPreview(data);
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setImportBusy(false);
    }
  }

  async function handleImportCommit() {
    if (!importFile) return;
    setImportBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const { data } = await apiClient.post<{
        created_count: number;
        updated_count: number;
        skipped_count: number;
      }>("/products/import/commit", formData, { params: { mode: importMode, atomic: importAtomic } });
      message.success(
        `${tp("import.createCount", { count: data.created_count })} / ${tp("import.updateCount", {
          count: data.updated_count,
        })} / ${tp("import.skipCount", { count: data.skipped_count })}`,
      );
      setImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
      refreshList();
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setImportBusy(false);
    }
  }

  const previewColumns: ColumnsType<ImportRowResult> = [
    { title: tp("import.rowNumber"), dataIndex: "row_number", width: 70 },
    { title: "SKU", dataIndex: "sku" },
    { title: tp("import.action"), dataIndex: "action" },
    {
      title: tp("import.errors"),
      dataIndex: "errors",
      render: (errs: string[]) => errs?.join("; "),
    },
  ];

  // ------------------------------------------------------------------
  // Table columns / form fields
  // ------------------------------------------------------------------

  const columns: ColumnsType<Product> = [
    { title: tp("columns.sku"), dataIndex: "sku", sorter: true },
    {
      title: tp("columns.name"),
      dataIndex: "name",
      sorter: true,
      ellipsis: true,
      render: (name: string, record) => <Link to={`/catalog/products/${record.id}`}>{name}</Link>,
    },
    {
      title: tp("columns.status"),
      dataIndex: "status",
      render: (s: ProductStatus) => <Tag color={statusColor[s]}>{t(`common:productStatus.${s}`)}</Tag>,
    },
    {
      title: tp("columns.price"),
      dataIndex: "price",
      sorter: true,
      render: (v: string, record) => `${v} ${record.currency}`,
    },
    { title: tp("columns.stock"), dataIndex: "stock_quantity", sorter: true },
    { title: tp("columns.availableQty"), dataIndex: "available_quantity" },
    {
      title: tp("columns.availability"),
      dataIndex: "availability_status",
      render: (s: AvailabilityStatus) => (
        <Tag color={availabilityColor[s]}>{t(`common:availabilityStatus.${s}`)}</Tag>
      ),
    },
    {
      title: tp("columns.featured"),
      dataIndex: "is_featured",
      render: (featured: boolean) => (featured ? <Tag color="gold">{t("common:featured")}</Tag> : null),
    },
  ];

  const toolbar = (
    <Space wrap>
      <Select
        allowClear
        placeholder={tp("columns.status")}
        style={{ width: 160 }}
        options={statusOptions}
        value={statusFilter}
        onChange={setStatusFilter}
      />
      <Dropdown
        menu={{ items: bulkMenuItems, onClick: ({ key }) => openBulkAction(key) }}
        disabled={selectedIds.length === 0}
        trigger={["click"]}
      >
        <Button>{`${tp("bulk.title")} (${selectedIds.length})`}</Button>
      </Dropdown>
      <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
        {tp("actions.import")}
      </Button>
      <Dropdown
        menu={{ items: exportMenuItems, onClick: ({ key }) => handleExportMenuClick(key) }}
        trigger={["click"]}
      >
        <Button icon={<DownloadOutlined />}>{tp("actions.export")}</Button>
      </Dropdown>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/catalog/products/new")}>
        {t("common:new")}
      </Button>
    </Space>
  );

  return (
    <>
      <CrudPage<Product>
        title={tp("title")}
        description={tp("description")}
        resourceHooks={hooks}
        columns={columns}
        formFields={[]}
        allowCreate={false}
        allowEdit={false}
        extraToolbar={toolbar}
        extraFilters={{ product_status: statusFilter }}
        extraRowActions={renderRowActions}
        rowSelectionEnabled
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys)}
      />

      <Modal
        open={bulkAction !== null}
        title={bulkAction ? tp(bulkTitleKey[bulkAction]) : ""}
        onCancel={() => setBulkAction(null)}
        onOk={submitBulkAction}
        confirmLoading={bulkSubmitting}
        okText={tp("bulk.apply")}
        destroyOnHidden
      >
        {renderBulkModalBody()}
      </Modal>

      <Modal
        open={cloneTarget !== null}
        title={tp("actions.cloneTitle")}
        onCancel={() => setCloneTarget(null)}
        onOk={submitClone}
        okText={tp("actions.clone")}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Typography.Text>{tp("actions.newSku")}</Typography.Text>
            <Input
              value={cloneValues.new_sku}
              onChange={(e) => setCloneValues((v) => ({ ...v, new_sku: e.target.value }))}
            />
          </div>
          <div>
            <Typography.Text>{tp("actions.newSlug")}</Typography.Text>
            <Input
              value={cloneValues.new_slug}
              onChange={(e) => setCloneValues((v) => ({ ...v, new_slug: e.target.value }))}
            />
          </div>
          <div>
            <Typography.Text>{tp("actions.newName")}</Typography.Text>
            <Input
              value={cloneValues.new_name}
              onChange={(e) => setCloneValues((v) => ({ ...v, new_name: e.target.value }))}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        open={importOpen}
        title={tp("import.title")}
        onCancel={() => {
          setImportOpen(false);
          setImportFile(null);
          setImportPreview(null);
        }}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Radio.Group value={importMode} onChange={(e) => setImportMode(e.target.value)}>
            <Radio.Button value="full">{tp("import.modeFull")}</Radio.Button>
            <Radio.Button value="price_only">{tp("import.modePriceOnly")}</Radio.Button>
            <Radio.Button value="stock_only">{tp("import.modeStockOnly")}</Radio.Button>
          </Radio.Group>

          <Upload.Dragger
            beforeUpload={(file) => {
              setImportFile(file);
              setImportPreview(null);
              return false;
            }}
            maxCount={1}
            fileList={
              importFile
                ? [{ uid: "1", name: importFile.name, status: "done" as const }]
                : []
            }
            onRemove={() => setImportFile(null)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p>{tp("import.chooseFile")}</p>
          </Upload.Dragger>

          <Space>
            <Button onClick={handleImportPreview} disabled={!importFile} loading={importBusy}>
              {tp("import.preview")}
            </Button>
            <Checkbox checked={importAtomic} onChange={(e) => setImportAtomic(e.target.checked)}>
              {tp("import.atomic")}
            </Checkbox>
            <Button type="primary" onClick={handleImportCommit} disabled={!importFile} loading={importBusy}>
              {tp("import.commit")}
            </Button>
          </Space>

          {importPreview && (
            <>
              <Space wrap>
                <Tag>{tp("import.totalRows", { count: importPreview.total_rows })}</Tag>
                <Tag color="green">{tp("import.validRows", { count: importPreview.valid_rows })}</Tag>
                <Tag color="red">{tp("import.invalidRows", { count: importPreview.invalid_rows })}</Tag>
              </Space>
              <Table<ImportRowResult>
                size="small"
                rowKey="row_number"
                columns={previewColumns}
                dataSource={importPreview.rows}
                pagination={{ pageSize: 10 }}
                scroll={{ y: 300 }}
              />
            </>
          )}
        </Space>
      </Modal>
    </>
  );
}
