import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined, PictureOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, extractErrorMessage } from "@/api/client";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { PaginatedResponse } from "@/types/api";
import type { Collection, Manufacturer, Product, ProductStatus } from "@/types/entities";

const collectionHooks = createResourceHooks<Collection>("/collections", "collections");
const manufacturerHooks = createResourceHooks<Manufacturer>("/manufacturers", "manufacturers");

const statusColor: Record<ProductStatus, string> = {
  draft: "default",
  active: "green",
  archived: "red",
};

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string, opts?: Record<string, unknown>) =>
    t(`collections.detail.${key}`, { ns: "catalog", ...opts });
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data: collection, isLoading: collectionLoading } = collectionHooks.useGet(id);
  const { data: manufacturer } = manufacturerHooks.useGet(collection?.manufacturer_id);

  const productsQueryKey = ["collection-products", id];
  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: productsQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", {
        params: { collection_id: id, page_size: 100 },
      });
      return data;
    },
    enabled: Boolean(id),
  });

  const products = productsResponse?.items ?? [];
  const productIdsInCollection = new Set(products.map((p) => p.id));

  function invalidateCollectionProducts() {
    queryClient.invalidateQueries({ queryKey: productsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["products", "list"] });
  }

  // ------------------------------------------------------------------
  // Remove a single product from the collection
  // ------------------------------------------------------------------
  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiClient.post("/products/bulk/collection", {
        product_ids: [productId],
        collection_id: null,
      });
    },
    onSuccess: () => {
      message.success(tp("removeSuccess"));
      invalidateCollectionProducts();
    },
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  // ------------------------------------------------------------------
  // Add products picker
  // ------------------------------------------------------------------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelected, setPickerSelected] = useState<string[]>([]);

  const { data: pickerResponse, isFetching: pickerFetching } = useQuery({
    queryKey: ["product-picker", pickerSearch],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", {
        params: { search: pickerSearch || undefined, page_size: 50 },
      });
      return data;
    },
    enabled: pickerOpen,
  });

  const pickerItems = (pickerResponse?.items ?? []).filter((p) => !productIdsInCollection.has(p.id));

  const addMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      await apiClient.post("/products/bulk/collection", {
        product_ids: productIds,
        collection_id: id,
      });
    },
    onSuccess: (_data, productIds) => {
      message.success(tp("addSuccess", { count: productIds.length }));
      invalidateCollectionProducts();
      closePicker();
    },
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  function closePicker() {
    setPickerOpen(false);
    setPickerSelected([]);
    setPickerSearch("");
  }

  function togglePickerSelected(productId: string, checked: boolean) {
    setPickerSelected((prev) => (checked ? [...prev, productId] : prev.filter((x) => x !== productId)));
  }

  if (collectionLoading || !collection) {
    return (
      <div style={{ textAlign: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate("/catalog/collections")}
        style={{ marginBottom: 12, paddingLeft: 0 }}
      >
        {tp("back")}
      </Button>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          {collection.image_url && (
            <Col flex="120px">
              <img
                src={collection.image_url}
                alt={collection.name}
                style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }}
              />
            </Col>
          )}
          <Col flex="auto">
            <Space align="center" wrap>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {collection.name}
              </Typography.Title>
              <Tag color={collection.is_active ? "green" : "default"}>
                {collection.is_active ? t("common:active") : t("common:inactive")}
              </Tag>
            </Space>
            <div>
              <Typography.Text type="secondary">
                {tp("code")}: {collection.code} &middot; {tp("manufacturer")}:{" "}
                {manufacturer?.name ?? collection.manufacturer_id}
              </Typography.Text>
            </div>
            {collection.description && (
              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {collection.description}
              </Typography.Paragraph>
            )}
          </Col>
        </Row>
      </Card>

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          {tp("productsTitle", { count: products.length })}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
          {tp("addProducts")}
        </Button>
      </div>

      {productsLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : products.length === 0 ? (
        <Empty description={tp("emptyDescription")}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
            {tp("addProducts")}
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {products.map((product) => (
            <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
              <Card
                hoverable
                styles={{ body: { paddingBottom: 12 } }}
                cover={
                  <div
                    style={{
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(128,128,128,0.08)",
                    }}
                  >
                    <PictureOutlined style={{ fontSize: 36, opacity: 0.35 }} />
                  </div>
                }
                actions={[
                  <Popconfirm
                    key="remove"
                    title={tp("removeConfirmTitle")}
                    onConfirm={() => removeMutation.mutate(product.id)}
                    okText={t("common:delete")}
                    cancelText={t("common:cancel")}
                    okButtonProps={{ danger: true, loading: removeMutation.isPending }}
                  >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />}>
                      {tp("removeFromCollection")}
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  title={product.name}
                  description={
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Typography.Text type="secondary">{product.sku}</Typography.Text>
                      <Typography.Text strong>
                        {product.price} {product.currency}
                      </Typography.Text>
                      <Tag color={statusColor[product.status]}>{t(`common:productStatus.${product.status}`)}</Tag>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        open={pickerOpen}
        title={tp("pickerTitle")}
        onCancel={closePicker}
        onOk={() => addMutation.mutate(pickerSelected)}
        okText={tp("addSelected", { count: pickerSelected.length })}
        okButtonProps={{ disabled: pickerSelected.length === 0, loading: addMutation.isPending }}
        width={640}
        destroyOnHidden
      >
        <Input.Search
          placeholder={tp("pickerSearchPlaceholder")}
          allowClear
          onSearch={(value) => setPickerSearch(value)}
          style={{ marginBottom: 12 }}
        />
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {pickerFetching ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : pickerItems.length === 0 ? (
            <Empty description={tp("pickerEmpty")} />
          ) : (
            <Space direction="vertical" style={{ width: "100%" }}>
              {pickerItems.map((product) => (
                <Checkbox
                  key={product.id}
                  checked={pickerSelected.includes(product.id)}
                  onChange={(e) => togglePickerSelected(product.id, e.target.checked)}
                  style={{ width: "100%" }}
                >
                  <Space>
                    <Typography.Text strong>{product.name}</Typography.Text>
                    <Typography.Text type="secondary">({product.sku})</Typography.Text>
                    <Tag color={statusColor[product.status]}>{t(`common:productStatus.${product.status}`)}</Tag>
                  </Space>
                </Checkbox>
              ))}
            </Space>
          )}
        </div>
      </Modal>
    </div>
  );
}
