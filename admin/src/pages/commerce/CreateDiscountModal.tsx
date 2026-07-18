import { useState } from "react";
import { App, DatePicker, Form, Input, InputNumber, Modal, Radio, Switch } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { extractErrorMessage } from "@/api/client";
import { ResourceSelect } from "@/components/EntityFormModal";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { AmountType, Discount } from "@/types/entities";

const discountHooks = createResourceHooks<Discount>("/discounts", "discounts");

type ScopeChoice = "all" | "category" | "product";

interface CreateDiscountModalProps {
  open: boolean;
  onClose: () => void;
}

// Bespoke instead of the generic CrudPage form: a discount's scope decides
// which target field(s) make sense (none for "all", several categories at
// once for "category", a single product for "product"), and "several
// categories" fans out into one API call per category — none of that
// conditional-field/fan-out behavior fits the declarative FormFieldConfig
// shape the rest of this admin uses for plain CRUD.
export function CreateDiscountModal({ open, onClose }: CreateDiscountModalProps) {
  const { message } = App.useApp();
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`discounts.${key}`, { ns: "commerce" });
  const createMutation = discountHooks.useCreate();

  const [name, setName] = useState("");
  const [scopeChoice, setScopeChoice] = useState<ScopeChoice>("all");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [productId, setProductId] = useState<string | undefined>();
  const [amountType, setAmountType] = useState<AmountType>("percentage");
  const [value, setValue] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setScopeChoice("all");
    setCategoryIds([]);
    setProductId(undefined);
    setAmountType("percentage");
    setValue(null);
    setIsActive(true);
    setStartsAt(null);
    setEndsAt(null);
  }

  function handleCancel() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (value === null) {
      message.error(tp("createModal.valueRequired"));
      return;
    }
    if (scopeChoice === "category" && categoryIds.length === 0) {
      message.error(tp("createModal.categoryRequired"));
      return;
    }
    if (scopeChoice === "product" && !productId) {
      message.error(tp("createModal.productRequired"));
      return;
    }

    const basePayload = {
      name: name || null,
      amount_type: amountType,
      value: String(value),
      is_active: isActive,
      starts_at: startsAt,
      ends_at: endsAt,
    };

    setSubmitting(true);
    try {
      if (scopeChoice === "all") {
        await createMutation.mutateAsync({ ...basePayload, scope: "all" } as Partial<Discount>);
      } else if (scopeChoice === "category") {
        await Promise.all(
          categoryIds.map((categoryId) =>
            createMutation.mutateAsync({
              ...basePayload,
              scope: "category",
              category_id: categoryId,
            } as Partial<Discount>),
          ),
        );
      } else {
        await createMutation.mutateAsync({
          ...basePayload,
          scope: "product",
          product_id: productId,
        } as Partial<Discount>);
      }
      message.success(tp("createModal.success"));
      reset();
      onClose();
    } catch (error) {
      message.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={tp("createModal.title")}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={tp("createModal.submit")}
      cancelText={t("common:cancel")}
      destroyOnHidden
      width={560}
    >
      <Form layout="vertical">
        <Form.Item label={tp("fields.name")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tp("createModal.namePlaceholder")}
          />
        </Form.Item>

        <Form.Item label={tp("createModal.target")}>
          <Radio.Group
            value={scopeChoice}
            onChange={(e) => setScopeChoice(e.target.value as ScopeChoice)}
          >
            <Radio.Button value="all">{tp("fields.scopeAll")}</Radio.Button>
            <Radio.Button value="category">{tp("fields.scopeCategory")}</Radio.Button>
            <Radio.Button value="product">{tp("fields.scopeProduct")}</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {scopeChoice === "category" && (
          <Form.Item label={tp("createModal.categoriesLabel")} required>
            <ResourceSelect
              mode="multiple"
              resource={{ endpoint: "/categories", labelKey: "name" }}
              value={categoryIds}
              onChange={(v) => setCategoryIds((v as string[] | undefined) ?? [])}
              placeholder={tp("createModal.categoriesPlaceholder")}
            />
          </Form.Item>
        )}

        {scopeChoice === "product" && (
          <Form.Item label={tp("fields.productScope")} required>
            <ResourceSelect
              resource={{ endpoint: "/products", labelKey: "name" }}
              value={productId}
              onChange={(v) => setProductId(v as string | undefined)}
              placeholder={tp("createModal.productPlaceholder")}
            />
          </Form.Item>
        )}

        <Form.Item label={tp("fields.amountType")}>
          <Radio.Group
            value={amountType}
            onChange={(e) => setAmountType(e.target.value as AmountType)}
          >
            <Radio.Button value="percentage">{tp("fields.amountTypePercentage")}</Radio.Button>
            <Radio.Button value="fixed_amount">{tp("fields.amountTypeFixed")}</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label={tp("fields.value")} required>
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            step={amountType === "percentage" ? 1 : 0.01}
            max={amountType === "percentage" ? 100 : undefined}
            value={value}
            onChange={setValue}
            addonAfter={amountType === "percentage" ? "%" : undefined}
          />
        </Form.Item>

        <Form.Item label={tp("fields.startsAt")}>
          <DatePicker
            style={{ width: "100%" }}
            showTime
            value={startsAt ? dayjs(startsAt) : null}
            onChange={(date) => setStartsAt(date ? date.toISOString() : null)}
          />
        </Form.Item>

        <Form.Item label={tp("fields.endsAt")}>
          <DatePicker
            style={{ width: "100%" }}
            showTime
            value={endsAt ? dayjs(endsAt) : null}
            onChange={(date) => setEndsAt(date ? date.toISOString() : null)}
          />
        </Form.Item>

        <Form.Item label={tp("fields.active")}>
          <Switch checked={isActive} onChange={setIsActive} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
