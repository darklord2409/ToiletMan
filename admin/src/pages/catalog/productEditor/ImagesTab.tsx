import { useRef, useState } from "react";
import {
  App,
  Button,
  Empty,
  Modal,
  Popconfirm,
  Skeleton,
  Slider,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import {
  DeleteOutlined,
  InboxOutlined,
  ScissorOutlined,
  StarFilled,
  StarOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";

import { apiClient, extractErrorMessage } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { ProductImage, UploadedFile } from "@/types/entities";

import { getCroppedImageBlob } from "./cropImage";

async function uploadRawFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<UploadedFile>("/uploaded-files/upload", formData);
  return data;
}

async function uploadBlob(blob: Blob, filename: string): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", blob, filename);
  const { data } = await apiClient.post<UploadedFile>("/uploaded-files/upload", formData);
  return data;
}

interface SortableCardProps {
  image: ProductImage;
  onSetPrimary: (image: ProductImage) => void;
  onCrop: (image: ProductImage) => void;
  onReplace: (image: ProductImage, file: File) => void;
  onDelete: (image: ProductImage) => void;
}

function SortableImageCard({ image, onSetPrimary, onCrop, onReplace, onDelete }: SortableCardProps) {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`products.images.${key}`, { ns: "catalog" });
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        border: "1px solid var(--ant-color-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--ant-color-bg-container)",
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{ cursor: "grab", aspectRatio: "1 / 1", overflow: "hidden", background: "#00000010" }}
      >
        <img
          src={image.url}
          alt={image.alt_text ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
      <div style={{ padding: 8 }}>
        {image.is_primary && (
          <Tag color="gold" style={{ marginBottom: 6 }}>
            {tp("primary")}
          </Tag>
        )}
        <Space size="small" wrap>
          <Button
            size="small"
            icon={image.is_primary ? <StarFilled /> : <StarOutlined />}
            onClick={() => onSetPrimary(image)}
            disabled={image.is_primary}
            title={tp("setPrimary")}
          />
          <Button size="small" icon={<ScissorOutlined />} onClick={() => onCrop(image)} title={tp("crop")} />
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => replaceInputRef.current?.click()}
            title={tp("replace")}
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(image, file);
              e.target.value = "";
            }}
          />
          <Popconfirm title={t("common:confirmDeleteTitle")} onConfirm={() => onDelete(image)}>
            <Button size="small" danger icon={<DeleteOutlined />} title={t("common:delete")} />
          </Popconfirm>
        </Space>
      </div>
    </div>
  );
}

export function ImagesTab({ productId }: { productId: string }) {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`products.images.${key}`, { ns: "catalog" });
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [cropTarget, setCropTarget] = useState<ProductImage | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [cropSaving, setCropSaving] = useState(false);

  const queryKey = ["product-images", productId];
  const imagesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProductImage>>("/product-images", {
        params: { product_id: productId, page_size: 100, sort_by: "sort_order", sort_order: "asc" },
      });
      return data.items;
    },
  });
  const images = imagesQuery.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey });
  }

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const [index, file] of files.entries()) {
        const uploaded = await uploadRawFile(file);
        await apiClient.post("/product-images", {
          product_id: productId,
          url: uploaded.file_path,
          sort_order: images.length + index,
          is_primary: images.length === 0 && index === 0,
        });
      }
    },
    onSuccess: invalidate,
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  const uploadProps: UploadProps = {
    multiple: true,
    accept: "image/*",
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

  async function handleSetPrimary(image: ProductImage) {
    try {
      await Promise.all(
        images
          .filter((img) => img.is_primary && img.id !== image.id)
          .map((img) => apiClient.patch(`/product-images/${img.id}`, { is_primary: false })),
      );
      await apiClient.patch(`/product-images/${image.id}`, { is_primary: true });
      invalidate();
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  async function handleDelete(image: ProductImage) {
    try {
      await apiClient.delete(`/product-images/${image.id}`);
      invalidate();
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  async function handleReplace(image: ProductImage, file: File) {
    try {
      const uploaded = await uploadRawFile(file);
      await apiClient.patch(`/product-images/${image.id}`, { url: uploaded.file_path });
      invalidate();
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  function openCrop(image: ProductImage) {
    setCropTarget(image);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
  }

  async function confirmCrop() {
    if (!cropTarget || !croppedArea) return;
    setCropSaving(true);
    try {
      const blob = await getCroppedImageBlob(cropTarget.url, {
        x: croppedArea.x,
        y: croppedArea.y,
        width: croppedArea.width,
        height: croppedArea.height,
      });
      const uploaded = await uploadBlob(blob, "cropped.jpg");
      await apiClient.patch(`/product-images/${cropTarget.id}`, { url: uploaded.file_path });
      invalidate();
      setCropTarget(null);
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setCropSaving(false);
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(images, oldIndex, newIndex);
    queryClient.setQueryData(queryKey, reordered);
    try {
      await Promise.all(
        reordered.map((img, index) =>
          img.sort_order === index
            ? Promise.resolve()
            : apiClient.patch(`/product-images/${img.id}`, { sort_order: index }),
        ),
      );
      invalidate();
    } catch (err) {
      message.error(extractErrorMessage(err));
      invalidate();
    }
  }

  if (imagesQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  return (
    <div>
      <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p>{tp("dropHint")}</p>
      </Upload.Dragger>

      {images.length === 0 ? (
        <Empty description={tp("empty")} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              {images.map((image) => (
                <SortableImageCard
                  key={image.id}
                  image={image}
                  onSetPrimary={handleSetPrimary}
                  onCrop={openCrop}
                  onReplace={handleReplace}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        open={cropTarget !== null}
        title={tp("crop")}
        onCancel={() => setCropTarget(null)}
        onOk={confirmCrop}
        confirmLoading={cropSaving}
        destroyOnHidden
        width={560}
      >
        {cropTarget && (
          <>
            <div style={{ position: "relative", width: "100%", height: 360, background: "#333" }}>
              <Cropper
                image={cropTarget.url}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedArea(area)}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <Typography.Text>{tp("zoom")}</Typography.Text>
              <Slider min={1} max={3} step={0.1} value={zoom} onChange={setZoom} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
