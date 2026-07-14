import { useState } from "react";
import { App, Button, DatePicker, Empty, Form, Input, InputNumber, Select, Skeleton, Switch } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { apiClient, extractErrorMessage } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type {
  AttributeDefinition,
  AttributeSetItem,
  ProductAttribute,
  ProductType,
  ReferenceValue,
} from "@/types/entities";

interface SpecValue {
  value_string: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_reference_id: string | null;
}

const EMPTY_VALUE: SpecValue = {
  value_string: null,
  value_number: null,
  value_boolean: null,
  value_date: null,
  value_reference_id: null,
};

export function SpecificationsTab({
  productId,
  productTypeId,
}: {
  productId: string;
  productTypeId: string;
}) {
  const { t, i18n } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`products.specifications.${key}`, { ns: "catalog" });
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, SpecValue>>({});
  const [existingIds, setExistingIds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const productTypeQuery = useQuery({
    queryKey: ["product-type", productTypeId],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductType>(`/product-types/${productTypeId}`);
      return data;
    },
  });

  const attributeSetId = productTypeQuery.data?.attribute_set_id;

  const itemsQuery = useQuery({
    queryKey: ["attribute-set-items", attributeSetId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AttributeSetItem>>(
        "/attribute-set-items",
        { params: { attribute_set_id: attributeSetId, page_size: 100, sort_by: "sort_order" } },
      );
      return data.items;
    },
    enabled: Boolean(attributeSetId),
  });

  const definitionsQuery = useQuery({
    queryKey: ["attribute-definitions-all"],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AttributeDefinition>>(
        "/attribute-definitions",
        { params: { page_size: 200 } },
      );
      return data.items;
    },
  });

  const productAttributesQuery = useQuery({
    queryKey: ["product-attributes", productId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProductAttribute>>(
        "/product-attributes",
        { params: { product_id: productId, page_size: 200 } },
      );
      return data.items;
    },
  });

  const referenceValuesQuery = useQuery({
    queryKey: ["reference-values-all"],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ReferenceValue>>("/reference-values", {
        params: { page_size: 500 },
      });
      return data.items;
    },
  });

  // Resyncs the edit buffer whenever a fetch resolves with a new
  // `productAttributesQuery.data` reference — done during render (React's
  // "adjusting state when a prop changes" pattern) rather than in an effect.
  const [syncedAttributesData, setSyncedAttributesData] = useState(productAttributesQuery.data);
  if (syncedAttributesData !== productAttributesQuery.data) {
    setSyncedAttributesData(productAttributesQuery.data);
    if (productAttributesQuery.data) {
      const nextValues: Record<string, SpecValue> = {};
      const nextIds: Record<string, string> = {};
      for (const attr of productAttributesQuery.data) {
        nextValues[attr.attribute_definition_id] = {
          value_string: attr.value_string,
          value_number: attr.value_number ? Number(attr.value_number) : null,
          value_boolean: attr.value_boolean,
          value_date: attr.value_date,
          value_reference_id: attr.value_reference_id,
        };
        nextIds[attr.attribute_definition_id] = attr.id;
      }
      setValues(nextValues);
      setExistingIds(nextIds);
    }
  }

  const definitionsById = new Map((definitionsQuery.data ?? []).map((d) => [d.id, d]));
  const items = itemsQuery.data ?? [];

  const isLoading =
    productTypeQuery.isLoading ||
    itemsQuery.isLoading ||
    definitionsQuery.isLoading ||
    productAttributesQuery.isLoading;

  function setValue(definitionId: string, patch: Partial<SpecValue>) {
    setValues((prev) => ({ ...prev, [definitionId]: { ...EMPTY_VALUE, ...prev[definitionId], ...patch } }));
  }

  function localizedRefName(ref: ReferenceValue): string {
    const locale = i18n.language;
    return ref.translations[locale]?.name ?? ref.translations.ru?.name ?? ref.code;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        items.map(async (item) => {
          const definitionId = item.attribute_definition_id;
          const value = values[definitionId];
          const existingId = existingIds[definitionId];
          const isEmpty =
            !value ||
            (value.value_string === null &&
              value.value_number === null &&
              value.value_boolean === null &&
              value.value_date === null &&
              value.value_reference_id === null);

          if (isEmpty) {
            if (existingId) await apiClient.delete(`/product-attributes/${existingId}`);
            return;
          }

          const payload = {
            product_id: productId,
            attribute_definition_id: definitionId,
            ...value,
          };
          if (existingId) {
            await apiClient.patch(`/product-attributes/${existingId}`, payload);
          } else {
            await apiClient.post("/product-attributes", payload);
          }
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ["product-attributes", productId] });
      message.success(t("common:updateSuccess", { entity: tp("title") }));
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (items.length === 0) {
    return <Empty description={tp("empty")} />;
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Form layout="vertical">
        {items.map((item) => {
          const definition = definitionsById.get(item.attribute_definition_id);
          if (!definition) return null;
          const value = values[item.attribute_definition_id] ?? EMPTY_VALUE;
          const label = `${definition.name}${item.is_required ? " *" : ""}`;

          return (
            <Form.Item key={item.id} label={label}>
              {definition.data_type === "string" && (
                <Input
                  value={value.value_string ?? ""}
                  onChange={(e) =>
                    setValue(item.attribute_definition_id, { value_string: e.target.value || null })
                  }
                />
              )}
              {definition.data_type === "number" && (
                <InputNumber
                  style={{ width: "100%" }}
                  value={value.value_number ?? undefined}
                  onChange={(v) => setValue(item.attribute_definition_id, { value_number: v })}
                />
              )}
              {definition.data_type === "boolean" && (
                <Switch
                  checked={Boolean(value.value_boolean)}
                  onChange={(checked) =>
                    setValue(item.attribute_definition_id, { value_boolean: checked })
                  }
                />
              )}
              {definition.data_type === "date" && (
                <DatePicker
                  style={{ width: "100%" }}
                  value={value.value_date ? dayjs(value.value_date) : null}
                  onChange={(d) =>
                    setValue(item.attribute_definition_id, {
                      value_date: d ? d.toISOString() : null,
                    })
                  }
                />
              )}
              {definition.data_type === "reference" && (
                <Select
                  allowClear
                  value={value.value_reference_id ?? undefined}
                  onChange={(v) =>
                    setValue(item.attribute_definition_id, { value_reference_id: v ?? null })
                  }
                  options={(referenceValuesQuery.data ?? [])
                    .filter((ref) => ref.reference_type === definition.reference_type)
                    .map((ref) => ({ label: localizedRefName(ref), value: ref.id }))}
                />
              )}
            </Form.Item>
          );
        })}
      </Form>
      <Button type="primary" onClick={handleSave} loading={saving}>
        {t("common:save")}
      </Button>
    </div>
  );
}
