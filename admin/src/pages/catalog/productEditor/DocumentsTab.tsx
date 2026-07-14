import { useState } from "react";
import { App, Button, Empty, Form, Input, Modal, Popconfirm, Select, Skeleton, Table, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { apiClient, extractErrorMessage } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { ProductDocument, ProductDocumentType, UploadedFile } from "@/types/entities";

const DOCUMENT_TYPES: ProductDocumentType[] = [
  "manual",
  "certificate",
  "warranty_card",
  "installation_instructions",
  "exploded_diagram",
];

export function DocumentsTab({ productId }: { productId: string }) {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`products.documents.${key}`, { ns: "catalog" });
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<ProductDocumentType>("manual");
  const [title, setTitle] = useState("");

  const queryKey = ["product-documents", productId];
  const documentsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProductDocument>>(
        "/product-documents",
        { params: { product_id: productId, page_size: 100, sort_by: "sort_order" } },
      );
      return data.items;
    },
  });
  const documents = documentsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("no file");
      const formData = new FormData();
      formData.append("file", file);
      const { data: uploaded } = await apiClient.post<UploadedFile>(
        "/uploaded-files/upload",
        formData,
      );
      await apiClient.post("/product-documents", {
        product_id: productId,
        document_type: documentType,
        title: title || uploaded.file_name,
        file_url: uploaded.file_path,
        mime_type: uploaded.mime_type,
        size_bytes: uploaded.size_bytes,
        sort_order: documents.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setModalOpen(false);
      setFile(null);
      setTitle("");
    },
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/product-documents/${id}`);
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  const columns: ColumnsType<ProductDocument> = [
    {
      title: tp("columns.type"),
      dataIndex: "document_type",
      render: (v: ProductDocumentType) => t(`catalog:products.documents.types.${v}`),
    },
    { title: tp("columns.title"), dataIndex: "title" },
    {
      title: tp("columns.file"),
      dataIndex: "file_url",
      render: (url: string) => (
        <a href={url} target="_blank" rel="noreferrer">
          {tp("view")}
        </a>
      ),
    },
    {
      title: t("common:actions"),
      key: "actions",
      render: (_, record) => (
        <Popconfirm title={t("common:confirmDeleteTitle")} onConfirm={() => handleDelete(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  if (documentsQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 3 }} />;
  }

  return (
    <div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setModalOpen(true)}
        style={{ marginBottom: 16 }}
      >
        {tp("add")}
      </Button>

      {documents.length === 0 ? (
        <Empty description={tp("empty")} />
      ) : (
        <Table<ProductDocument>
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={documents}
        />
      )}

      <Modal
        open={modalOpen}
        title={tp("add")}
        onCancel={() => setModalOpen(false)}
        onOk={() => createMutation.mutate()}
        confirmLoading={createMutation.isPending}
        okButtonProps={{ disabled: !file }}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label={tp("columns.type")}>
            <Select
              value={documentType}
              onChange={setDocumentType}
              options={DOCUMENT_TYPES.map((type) => ({
                label: t(`catalog:products.documents.types.${type}`),
                value: type,
              }))}
            />
          </Form.Item>
          <Form.Item label={tp("columns.title")}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Form.Item>
          <Form.Item label={tp("chooseFile")}>
            <Upload
              beforeUpload={(f) => {
                setFile(f);
                return false;
              }}
              maxCount={1}
              fileList={file ? [{ uid: "1", name: file.name, status: "done" as const }] : []}
              onRemove={() => setFile(null)}
            >
              <Button icon={<UploadOutlined />}>{tp("chooseFile")}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
