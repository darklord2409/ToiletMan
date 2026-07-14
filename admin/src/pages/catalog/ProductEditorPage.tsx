import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  InboxOutlined,
  RedoOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { apiClient, extractErrorMessage } from "@/api/client";
import { ResourceSelect } from "@/components/EntityFormModal";
import { createResourceHooks } from "@/hooks/useCrudResource";
import { useBreadcrumbExtra } from "@/layout/BreadcrumbContext";
import type { Product, ProductStatus } from "@/types/entities";

import { DocumentsTab } from "./productEditor/DocumentsTab";
import { HistoryTab } from "./productEditor/HistoryTab";
import { ImagesTab } from "./productEditor/ImagesTab";
import { LabelsTab } from "./productEditor/LabelsTab";
import { SpecificationsTab } from "./productEditor/SpecificationsTab";
import { VideosTab } from "./productEditor/VideosTab";

const hooks = createResourceHooks<Product>("/products", "products");

const statusColor: Record<ProductStatus, string> = {
  draft: "default",
  active: "green",
  archived: "red",
};

export default function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string, opts?: Record<string, unknown>) =>
    t(`products.${key}`, { ns: "catalog", ...opts });
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneValues, setCloneValues] = useState({ new_sku: "", new_slug: "", new_name: "" });

  const { useGet } = hooks;
  const productQuery = useGet(isNew ? undefined : id);
  const product = productQuery.data;

  useBreadcrumbExtra(isNew ? tp("actions.newProduct") : (product?.sku ?? null));

  useEffect(() => {
    if (product) {
      form.setFieldsValue({
        ...product,
        future_price_activates_at: product.future_price_activates_at
          ? dayjs(product.future_price_activates_at)
          : null,
      });
    }
  }, [product, form]);

  function refreshList() {
    queryClient.invalidateQueries({ queryKey: ["products", "list"] });
  }

  async function handleSave() {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd already highlights the invalid fields
    }
    setSaving(true);
    try {
      const payload = {
        ...values,
        future_price_activates_at: values.future_price_activates_at
          ? (values.future_price_activates_at as { toISOString: () => string }).toISOString()
          : null,
      };
      if (isNew) {
        const { data } = await apiClient.post<Product>("/products", payload);
        message.success(t("common:createSuccess", { entity: tp("title") }));
        refreshList();
        navigate(`/catalog/products/${data.id}`, { replace: true });
      } else {
        const { data } = await apiClient.patch<Product>(`/products/${id}`, payload);
        message.success(t("common:updateSuccess", { entity: tp("title") }));
        refreshList();
        queryClient.setQueryData(["products", "detail", id], data);
      }
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    try {
      const { data } = await apiClient.post<Product>(`/products/${id}/archive`);
      queryClient.setQueryData(["products", "detail", id], data);
      refreshList();
      message.success(tp("actions.archiveSuccess"));
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  async function handleRestore() {
    try {
      const { data } = await apiClient.post<Product>(`/products/${id}/restore`);
      queryClient.setQueryData(["products", "detail", id], data);
      refreshList();
      message.success(tp("actions.restoreSuccess"));
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  async function handleDelete() {
    try {
      await apiClient.delete(`/products/${id}`);
      refreshList();
      message.success(t("common:deleteSuccess"));
      navigate("/catalog/products");
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  async function submitClone() {
    try {
      const { data } = await apiClient.post<Product>(`/products/${id}/clone`, {
        new_sku: cloneValues.new_sku,
        new_slug: cloneValues.new_slug,
        new_name: cloneValues.new_name || undefined,
      });
      message.success(tp("actions.cloneSuccess"));
      setCloneOpen(false);
      refreshList();
      navigate(`/catalog/products/${data.id}`);
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  if (!isNew && productQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 14 }} />;
  }

  const statusOptions = [
    { label: t("common:productStatus.draft"), value: "draft" },
    { label: t("common:productStatus.active"), value: "active" },
    { label: t("common:productStatus.archived"), value: "archived" },
  ];

  const tabItems = [
    {
      key: "general",
      label: tp("tabs.general"),
      children: (
        <div style={{ maxWidth: 640 }}>
          <Form.Item name="sku" label={tp("fields.sku")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="barcode" label={tp("fields.barcode")}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label={tp("fields.slug")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label={tp("fields.name")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={tp("fields.description")}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="category_id" label={tp("fields.category")} rules={[{ required: true }]}>
            <ResourceSelect
              resource={{ endpoint: "/categories", labelKey: "name" }}
              value={form.getFieldValue("category_id")}
              onChange={(v) => form.setFieldValue("category_id", v)}
            />
          </Form.Item>
          <Form.Item name="manufacturer_id" label={tp("fields.manufacturer")}>
            <ResourceSelect
              resource={{ endpoint: "/manufacturers", labelKey: "name" }}
              value={form.getFieldValue("manufacturer_id")}
              onChange={(v) => form.setFieldValue("manufacturer_id", v)}
            />
          </Form.Item>
          <Form.Item name="unit_id" label={tp("fields.unit")} rules={[{ required: true }]}>
            <ResourceSelect
              resource={{ endpoint: "/units", labelKey: "name" }}
              value={form.getFieldValue("unit_id")}
              onChange={(v) => form.setFieldValue("unit_id", v)}
            />
          </Form.Item>
          <Form.Item name="product_type_id" label={tp("fields.productType")} rules={[{ required: true }]}>
            <ResourceSelect
              resource={{ endpoint: "/product-types", labelKey: "name" }}
              value={form.getFieldValue("product_type_id")}
              onChange={(v) => form.setFieldValue("product_type_id", v)}
            />
          </Form.Item>
          <Form.Item name="status" label={tp("fields.status")}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="is_featured" label={tp("fields.featured")} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="weight_kg" label={tp("fields.weightKg")}>
            <InputNumber style={{ width: "100%" }} step={0.01} />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "translations",
      label: tp("tabs.translations"),
      children: (
        <div style={{ maxWidth: 640 }}>
          <Typography.Title level={5}>EN</Typography.Title>
          <Form.Item name={["translations", "en", "name"]} label={tp("fields.nameEn")}>
            <Input />
          </Form.Item>
          <Form.Item name={["translations", "en", "description"]} label={tp("fields.descriptionEn")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name={["translations", "en", "meta_title"]} label={tp("fields.metaTitleEn")}>
            <Input />
          </Form.Item>
          <Form.Item
            name={["translations", "en", "meta_description"]}
            label={tp("fields.metaDescriptionEn")}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Typography.Title level={5}>UZ</Typography.Title>
          <Form.Item name={["translations", "uz", "name"]} label={tp("fields.nameUz")}>
            <Input />
          </Form.Item>
          <Form.Item name={["translations", "uz", "description"]} label={tp("fields.descriptionUz")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name={["translations", "uz", "meta_title"]} label={tp("fields.metaTitleUz")}>
            <Input />
          </Form.Item>
          <Form.Item
            name={["translations", "uz", "meta_description"]}
            label={tp("fields.metaDescriptionUz")}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "pricing",
      label: tp("tabs.pricing"),
      children: (
        <div style={{ maxWidth: 640 }}>
          <Form.Item name="price" label={tp("fields.price")} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} step={0.01} />
          </Form.Item>
          <Form.Item name="compare_at_price" label={tp("fields.compareAtPrice")}>
            <InputNumber style={{ width: "100%" }} step={0.01} />
          </Form.Item>
          <Form.Item name="cost_price" label={tp("fields.costPrice")}>
            <InputNumber style={{ width: "100%" }} step={0.01} />
          </Form.Item>
          <Form.Item name="sale_price" label={tp("fields.salePrice")}>
            <InputNumber style={{ width: "100%" }} step={0.01} />
          </Form.Item>
          <Form.Item name="future_price" label={tp("fields.futurePrice")}>
            <InputNumber style={{ width: "100%" }} step={0.01} />
          </Form.Item>
          <Form.Item name="future_price_activates_at" label={tp("fields.futurePriceActivatesAt")}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="currency" label={tp("fields.currency")}>
            <Input />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "inventory",
      label: tp("tabs.inventory"),
      children: (
        <div style={{ maxWidth: 640 }}>
          <Form.Item name="stock_quantity" label={tp("fields.stockQuantity")}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reserved_quantity" label={tp("fields.reservedQuantity")}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="is_unlimited_stock" label={tp("fields.unlimitedStock")} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="low_stock_threshold" label={tp("fields.lowStockThreshold")}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          {!isNew && product && (
            <Space size="large" style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">
                {tp("columns.availableQty")}: <b>{product.available_quantity}</b>
              </Typography.Text>
              <Tag>{t(`common:availabilityStatus.${product.availability_status}`)}</Tag>
            </Space>
          )}
        </div>
      ),
    },
    {
      key: "collections",
      label: tp("tabs.collections"),
      children: (
        <div style={{ maxWidth: 640 }}>
          <Form.Item name="collection_id" label={tp("fields.collection")}>
            <ResourceSelect
              resource={{ endpoint: "/collections", labelKey: "name" }}
              value={form.getFieldValue("collection_id")}
              onChange={(v) => form.setFieldValue("collection_id", v)}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "seo",
      label: tp("tabs.seo"),
      children: (
        <div style={{ maxWidth: 640 }}>
          <Form.Item name="canonical_url_override" label={tp("fields.canonicalUrlOverride")}>
            <Input />
          </Form.Item>
          <Form.Item
            name="seo"
            label={tp("fields.seo")}
            getValueProps={(value) => ({ value: value ? JSON.stringify(value, null, 2) : "" })}
            normalize={(value: string) => {
              if (!value) return null;
              try {
                return JSON.parse(value);
              } catch {
                return value; // kept as a raw string until it's valid JSON again
              }
            }}
          >
            <Input.TextArea rows={6} placeholder="{ }" />
          </Form.Item>
        </div>
      ),
    },
    ...(isNew
      ? []
      : [
          { key: "images", label: tp("tabs.images"), children: <ImagesTab productId={id!} /> },
          {
            key: "specifications",
            label: tp("tabs.specifications"),
            children: <SpecificationsTab productId={id!} productTypeId={product!.product_type_id} />,
          },
          { key: "labels", label: tp("tabs.labels"), children: <LabelsTab productId={id!} /> },
          { key: "documents", label: tp("tabs.documents"), children: <DocumentsTab productId={id!} /> },
          { key: "videos", label: tp("tabs.videos"), children: <VideosTab productId={id!} /> },
          { key: "history", label: tp("tabs.history"), children: <HistoryTab productId={id!} /> },
        ]),
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/catalog/products")}>
            {t("common:cancel")}
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {isNew ? tp("actions.newProduct") : product?.name}
          </Typography.Title>
          {!isNew && product && (
            <Tag color={statusColor[product.status]}>
              {t(`common:productStatus.${product.status}`)}
            </Tag>
          )}
        </Space>
        <Space wrap>
          {!isNew && product?.status === "archived" && (
            <Button icon={<RedoOutlined />} onClick={handleRestore}>
              {tp("actions.restore")}
            </Button>
          )}
          {!isNew && product?.status !== "archived" && (
            <Button icon={<InboxOutlined />} onClick={handleArchive}>
              {tp("actions.archive")}
            </Button>
          )}
          {!isNew && (
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                setCloneValues({
                  new_sku: `${product?.sku}-copy`,
                  new_slug: `${product?.slug}-copy`,
                  new_name: "",
                });
                setCloneOpen(true);
              }}
            >
              {tp("actions.clone")}
            </Button>
          )}
          {!isNew && (
            <Popconfirm
              title={t("common:confirmDeleteTitle")}
              description={t("common:confirmDeleteDescription")}
              onConfirm={handleDelete}
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                {t("common:delete")}
              </Button>
            </Popconfirm>
          )}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            {t("common:save")}
          </Button>
        </Space>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: "draft", currency: "UZS", is_featured: false }}
        >
          <Tabs items={tabItems} />
        </Form>
      </Card>

      <Modal
        open={cloneOpen}
        title={tp("actions.cloneTitle")}
        onCancel={() => setCloneOpen(false)}
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
    </div>
  );
}
