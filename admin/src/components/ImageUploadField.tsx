import { App, Button, Space, Spin, Upload } from "antd";
import type { UploadProps } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { apiClient, extractErrorMessage } from "@/api/client";
import type { UploadedFile } from "@/types/entities";

async function uploadRawFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<UploadedFile>("/uploaded-files/upload", formData);
  return data;
}

interface ImageUploadFieldProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
}

export function ImageUploadField({ value, onChange, disabled }: ImageUploadFieldProps) {
  const { t } = useTranslation("common");
  const { message } = App.useApp();

  const uploadMutation = useMutation({
    mutationFn: uploadRawFile,
    onSuccess: (uploaded) => onChange?.(uploaded.file_path),
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  const uploadProps: UploadProps = {
    accept: "image/*",
    showUploadList: false,
    disabled: disabled || uploadMutation.isPending,
    beforeUpload: (file) => {
      uploadMutation.mutate(file);
      return false;
    },
  };

  return (
    <Space align="start">
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 8,
          border: "1px solid var(--ant-color-border)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ant-color-fill-tertiary)",
          flexShrink: 0,
        }}
      >
        {uploadMutation.isPending ? (
          <Spin size="small" />
        ) : value ? (
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
      </div>
      <Space direction="vertical" size={4}>
        <Upload {...uploadProps}>
          <Button size="small" icon={<UploadOutlined />} disabled={disabled || uploadMutation.isPending}>
            {t("upload")}
          </Button>
        </Upload>
        {value && (
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={disabled}
            onClick={() => onChange?.(null)}
          >
            {t("remove")}
          </Button>
        )}
      </Space>
    </Space>
  );
}
