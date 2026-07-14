import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from "antd";
import dayjs from "dayjs";

import { apiClient } from "@/api/client";
import type { FormFieldConfig, SelectOption } from "@/components/formTypes";
import { ImageUploadField } from "@/components/ImageUploadField";
import type { PaginatedResponse } from "@/types/api";

interface EntityFormModalProps {
  open: boolean;
  title: string;
  fields: FormFieldConfig[];
  initialValues?: Record<string, unknown> | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}

// Exported so bespoke UI outside the generic form (e.g. Products' bulk
// manufacturer/category/collection change modals) can reuse the same
// async foreign-key dropdown instead of re-implementing it.
export function ResourceSelect({
  resource,
  value,
  onChange,
  placeholder,
  id,
}: {
  resource: NonNullable<FormFieldConfig["optionsResource"]>;
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
  id?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["form-options", resource.endpoint],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Record<string, unknown>>>(
        resource.endpoint,
        { params: { page_size: 100 } },
      );
      return data.items;
    },
  });

  const options: SelectOption[] = (data ?? []).map((item) => ({
    label: String(item[resource.labelKey] ?? item[resource.valueKey ?? "id"]),
    value: String(item[resource.valueKey ?? "id"]),
  }));

  return (
    <Select
      id={id}
      value={value as string | undefined}
      onChange={onChange}
      loading={isLoading}
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={placeholder}
      options={options}
    />
  );
}

export function EntityFormModal({
  open,
  title,
  fields,
  initialValues,
  submitting,
  onCancel,
  onSubmit,
}: EntityFormModalProps) {
  const { control, handleSubmit, reset } = useForm<Record<string, unknown>>({
    defaultValues: initialValues ?? {},
  });

  useEffect(() => {
    reset(initialValues ?? {});
  }, [initialValues, reset, open]);

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={submitting}
      destroyOnHidden
      width={560}
    >
      <Form layout="vertical">
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            label={field.label}
            htmlFor={field.name}
            required={field.required}
            tooltip={field.helpText}
          >
            <Controller
              name={field.name}
              control={control}
              rules={{ required: field.required }}
              render={({ field: rhf }) => {
                switch (field.type) {
                  case "textarea":
                    return (
                      <Input.TextArea
                        {...rhf}
                        id={field.name}
                        value={(rhf.value as string) ?? ""}
                        rows={3}
                        placeholder={field.placeholder}
                      />
                    );
                  case "number":
                  case "decimal":
                    return (
                      <InputNumber
                        id={field.name}
                        style={{ width: "100%" }}
                        value={rhf.value as number | undefined}
                        onChange={rhf.onChange}
                        placeholder={field.placeholder}
                        step={field.type === "decimal" ? 0.01 : 1}
                      />
                    );
                  case "boolean":
                    return (
                      <Switch id={field.name} checked={Boolean(rhf.value)} onChange={rhf.onChange} />
                    );
                  case "date":
                    return (
                      <DatePicker
                        id={field.name}
                        style={{ width: "100%" }}
                        showTime
                        value={rhf.value ? dayjs(rhf.value as string) : null}
                        onChange={(date) => rhf.onChange(date ? date.toISOString() : null)}
                      />
                    );
                  case "select":
                    if (field.optionsResource) {
                      return (
                        <ResourceSelect
                          id={field.name}
                          resource={field.optionsResource}
                          value={rhf.value}
                          onChange={rhf.onChange}
                          placeholder={field.placeholder}
                        />
                      );
                    }
                    return (
                      <Select
                        id={field.name}
                        value={rhf.value as string | undefined}
                        onChange={rhf.onChange}
                        allowClear
                        placeholder={field.placeholder}
                        options={field.options}
                      />
                    );
                  case "image":
                    return (
                      <ImageUploadField
                        value={rhf.value as string | null | undefined}
                        onChange={rhf.onChange}
                      />
                    );
                  case "json":
                    return (
                      <Input.TextArea
                        id={field.name}
                        rows={4}
                        value={
                          rhf.value ? JSON.stringify(rhf.value, null, 2) : ""
                        }
                        onChange={(e) => {
                          try {
                            rhf.onChange(e.target.value ? JSON.parse(e.target.value) : null);
                          } catch {
                            // ignore invalid JSON while typing
                          }
                        }}
                        placeholder={field.placeholder ?? "{ }"}
                      />
                    );
                  default:
                    return (
                      <Input
                        {...rhf}
                        id={field.name}
                        value={(rhf.value as string) ?? ""}
                        placeholder={field.placeholder}
                      />
                    );
                }
              }}
            />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
