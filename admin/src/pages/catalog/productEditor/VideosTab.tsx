import { useState } from "react";
import { App, Button, Empty, Form, Input, Modal, Popconfirm, Select, Skeleton, Table, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { apiClient, extractErrorMessage } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { ProductVideo, ProductVideoType, UploadedFile } from "@/types/entities";

const VIDEO_TYPES: ProductVideoType[] = ["youtube", "mp4", "external"];

export function VideosTab({ productId }: { productId: string }) {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`products.videos.${key}`, { ns: "catalog" });
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [videoType, setVideoType] = useState<ProductVideoType>("youtube");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const queryKey = ["product-videos", productId];
  const videosQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProductVideo>>("/product-videos", {
        params: { product_id: productId, page_size: 100, sort_by: "sort_order" },
      });
      return data.items;
    },
  });
  const videos = videosQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      let finalUrl = url;
      if (videoType === "mp4" && file) {
        const formData = new FormData();
        formData.append("file", file);
        const { data: uploaded } = await apiClient.post<UploadedFile>(
          "/uploaded-files/upload",
          formData,
        );
        finalUrl = uploaded.file_path;
      }
      await apiClient.post("/product-videos", {
        product_id: productId,
        video_type: videoType,
        title: title || null,
        url: finalUrl,
        sort_order: videos.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setModalOpen(false);
      setTitle("");
      setUrl("");
      setFile(null);
    },
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/product-videos/${id}`);
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  const columns: ColumnsType<ProductVideo> = [
    {
      title: tp("columns.type"),
      dataIndex: "video_type",
      render: (v: ProductVideoType) => t(`catalog:products.videos.types.${v}`),
    },
    { title: tp("columns.title"), dataIndex: "title" },
    {
      title: tp("columns.url"),
      dataIndex: "url",
      render: (u: string) => (
        <a href={u} target="_blank" rel="noreferrer">
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

  const canSubmit = videoType === "mp4" ? Boolean(file) : Boolean(url.trim());

  if (videosQuery.isLoading) {
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

      {videos.length === 0 ? (
        <Empty description={tp("empty")} />
      ) : (
        <Table<ProductVideo> rowKey="id" size="small" pagination={false} columns={columns} dataSource={videos} />
      )}

      <Modal
        open={modalOpen}
        title={tp("add")}
        onCancel={() => setModalOpen(false)}
        onOk={() => createMutation.mutate()}
        confirmLoading={createMutation.isPending}
        okButtonProps={{ disabled: !canSubmit }}
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label={tp("columns.type")}>
            <Select
              value={videoType}
              onChange={setVideoType}
              options={VIDEO_TYPES.map((type) => ({
                label: t(`catalog:products.videos.types.${type}`),
                value: type,
              }))}
            />
          </Form.Item>
          <Form.Item label={tp("columns.title")}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Form.Item>
          {videoType === "mp4" ? (
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
          ) : (
            <Form.Item label={tp("columns.url")}>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
