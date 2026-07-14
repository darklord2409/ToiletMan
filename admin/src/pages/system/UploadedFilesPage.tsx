import { useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Pagination,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import { CopyOutlined, DeleteOutlined, FileOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { apiClient, extractErrorMessage } from "@/api/client";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { UploadedFile } from "@/types/entities";

const hooks = createResourceHooks<UploadedFile>("/uploaded-files", "uploaded-files");
const PAGE_SIZE = 24;

function formatSize(bytes: number | null): string {
  if (bytes === null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file: UploadedFile): boolean {
  return file.mime_type?.startsWith("image/") ?? false;
}

async function uploadRawFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<UploadedFile>("/uploaded-files/upload", formData);
  return data;
}

export default function UploadedFilesPage() {
  const { t } = useTranslation(["system", "common"]);
  const tp = (key: string) => t(`uploadedFiles.${key}`, { ns: "system" });
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const listQuery = hooks.useList({
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    sort_by: "created_at",
    sort_order: "desc",
  });
  const deleteMutation = hooks.useDelete();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await uploadRawFile(file);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["uploaded-files", "list"] }),
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  const uploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: (info) => {
      const files: File[] = [];
      for (const f of info.fileList) {
        if (f.originFileObj) files.push(f.originFileObj);
      }
      if (files.length > 0) uploadMutation.mutate(files);
    },
  };

  function handleCopyUrl(file: UploadedFile) {
    void navigator.clipboard.writeText(file.file_path).then(() => message.success(t("common:copied")));
  }

  function handleDelete(file: UploadedFile) {
    deleteMutation.mutate(file.id, {
      onError: (err) => message.error(extractErrorMessage(err)),
    });
  }

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.meta.total_items ?? 0;

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
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {tp("title")}
          </Typography.Title>
          <Typography.Text type="secondary">{tp("description")}</Typography.Text>
        </div>
        <Space>
          <Input.Search
            placeholder={t("common:search")}
            allowClear
            style={{ width: 240 }}
            onSearch={(value) => {
              setPage(1);
              setSearch(value);
            }}
          />
          <Upload {...uploadProps}>
            <Button type="primary" icon={<UploadOutlined />} loading={uploadMutation.isPending}>
              {t("common:upload")}
            </Button>
          </Upload>
        </Space>
      </div>

      {listQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : items.length === 0 ? (
        <Empty description={tp("empty")} />
      ) : (
        <Row gutter={[16, 16]}>
          {items.map((file) => (
            <Col key={file.id} xs={12} sm={8} md={6} lg={4}>
              <Card
                size="small"
                styles={{ body: { padding: 8 } }}
                cover={
                  <div
                    style={{
                      aspectRatio: "1 / 1",
                      overflow: "hidden",
                      background: "var(--ant-color-fill-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isImage(file) ? (
                      <img
                        src={file.file_path}
                        alt={file.file_name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <FileOutlined style={{ fontSize: 32, opacity: 0.5 }} />
                    )}
                  </div>
                }
              >
                <Typography.Text ellipsis style={{ display: "block", fontSize: 12 }} title={file.file_name}>
                  {file.file_name}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {formatSize(file.size_bytes)}
                </Typography.Text>
                <div style={{ marginTop: 6 }}>
                  <Space size={4}>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      title={t("common:copyUrl")}
                      onClick={() => handleCopyUrl(file)}
                    />
                    <Popconfirm
                      title={t("common:confirmDeleteTitle")}
                      onConfirm={() => handleDelete(file)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} title={t("common:delete")} />
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {total > PAGE_SIZE && (
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
