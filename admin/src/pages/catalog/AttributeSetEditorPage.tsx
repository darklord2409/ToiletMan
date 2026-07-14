import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Col, Empty, Input, Popconfirm, Row, Skeleton, Space, Switch, Tag, Typography } from "antd";
import { ArrowLeftOutlined, DeleteOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { extractErrorMessage } from "@/api/client";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { AttributeDefinition, AttributeSet, AttributeSetItem, Unit } from "@/types/entities";

const attributeSetHooks = createResourceHooks<AttributeSet>("/attribute-sets", "attribute-sets");
const attributeSetItemHooks = createResourceHooks<AttributeSetItem>("/attribute-set-items", "attribute-set-items");
const attributeDefinitionHooks = createResourceHooks<AttributeDefinition>(
  "/attribute-definitions",
  "attribute-definitions",
);
const unitHooks = createResourceHooks<Unit>("/units", "units");

// Reusable drag handle + row shell for @dnd-kit/sortable — the same shape
// Product Images' reorderable gallery is expected to reuse later.
interface SortableItemRowProps {
  item: AttributeSetItem;
  definition: AttributeDefinition | undefined;
  unitSymbol: string | undefined;
  busy: boolean;
  onToggleRequired: (checked: boolean) => void;
  onToggleVisible: (checked: boolean) => void;
  onDefaultValueCommit: (value: string) => void;
  onRemove: () => void;
  tp: (key: string) => string;
  t: (key: string) => string;
}

function SortableItemRow({
  item,
  definition,
  unitSymbol,
  busy,
  onToggleRequired,
  onToggleVisible,
  onDefaultValueCommit,
  onRemove,
  tp,
  t,
}: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [defaultValue, setDefaultValue] = useState(item.default_value ?? "");
  // Re-syncs the edit buffer when the server value changes under this row
  // (e.g. a refetch after another edit) — done during render, per React's
  // "adjusting state when a prop changes" pattern, rather than in an effect.
  const [syncedValue, setSyncedValue] = useState(item.default_value);
  if (syncedValue !== item.default_value) {
    setSyncedValue(item.default_value);
    setDefaultValue(item.default_value ?? "");
  }

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    marginBottom: 8,
  };

  return (
    <Card ref={setNodeRef} style={style} size="small" styles={{ body: { padding: "10px 12px" } }}>
      <Row align="middle" gutter={12} wrap={false}>
        <Col flex="24px">
          <span
            {...attributes}
            {...listeners}
            style={{ cursor: "grab", display: "inline-flex", touchAction: "none" }}
            aria-label={tp("dragHint")}
          >
            <HolderOutlined />
          </span>
        </Col>
        <Col flex="auto" style={{ minWidth: 0 }}>
          <Space direction="vertical" size={0} style={{ maxWidth: "100%" }}>
            <Typography.Text strong ellipsis>
              {definition?.name ?? item.attribute_definition_id}
            </Typography.Text>
            <Space size={4} wrap>
              <Tag>{definition?.data_type ?? "?"}</Tag>
              {unitSymbol && <Tag color="blue">{unitSymbol}</Tag>}
            </Space>
          </Space>
        </Col>
        <Col flex="76px">
          <Space direction="vertical" size={0} align="center">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {tp("columns.required")}
            </Typography.Text>
            <Switch size="small" checked={item.is_required} onChange={onToggleRequired} disabled={busy} />
          </Space>
        </Col>
        <Col flex="76px">
          <Space direction="vertical" size={0} align="center">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {tp("columns.visible")}
            </Typography.Text>
            <Switch size="small" checked={item.is_visible} onChange={onToggleVisible} disabled={busy} />
          </Space>
        </Col>
        <Col flex="170px">
          <Input
            size="small"
            placeholder={tp("columns.defaultValue")}
            value={defaultValue}
            disabled={busy}
            onChange={(e) => setDefaultValue(e.target.value)}
            onBlur={() => {
              if (defaultValue !== (item.default_value ?? "")) {
                onDefaultValueCommit(defaultValue);
              }
            }}
            onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
          />
        </Col>
        <Col flex="32px">
          <Popconfirm
            title={tp("confirmRemoveTitle")}
            description={tp("confirmRemoveDescription")}
            onConfirm={onRemove}
            okText={tp("actions.remove")}
            cancelText={t("cancel")}
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} aria-label={tp("actions.remove")} />
          </Popconfirm>
        </Col>
      </Row>
    </Card>
  );
}

export default function AttributeSetEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`attributeSetEditor.${key}`, { ns: "catalog" });
  const tCommon = (key: string) => t(key, { ns: "common" });

  const [search, setSearch] = useState("");

  const setQuery = attributeSetHooks.useGet(id);
  const itemsQuery = attributeSetItemHooks.useList({
    attribute_set_id: id,
    page_size: 100,
    sort_by: "sort_order",
    sort_order: "asc",
  });
  // NOTE: the backend caps page_size at 100 (see dependencies/pagination.py,
  // `le=100`) — attribute definitions/units pools beyond that would need
  // real pagination or search-as-you-type against the API, not fetch-all.
  const definitionsQuery = attributeDefinitionHooks.useList({ page_size: 100 });
  const unitsQuery = unitHooks.useList({ page_size: 100 });

  const createItem = attributeSetItemHooks.useCreate();
  const updateItem = attributeSetItemHooks.useUpdate();
  const deleteItem = attributeSetItemHooks.useDelete();

  const [localItems, setLocalItems] = useState<AttributeSetItem[]>([]);
  // Resyncs the locally-sortable copy whenever a fetch resolves with a new
  // `itemsQuery.data` reference — done during render (see the identical
  // pattern on SortableItemRow above) instead of in an effect.
  const [syncedItemsData, setSyncedItemsData] = useState(itemsQuery.data);
  if (syncedItemsData !== itemsQuery.data) {
    setSyncedItemsData(itemsQuery.data);
    if (itemsQuery.data) {
      setLocalItems([...itemsQuery.data.items].sort((a, b) => a.sort_order - b.sort_order));
    }
  }

  const definitionMap = useMemo(() => {
    const map = new Map<string, AttributeDefinition>();
    (definitionsQuery.data?.items ?? []).forEach((d) => map.set(d.id, d));
    return map;
  }, [definitionsQuery.data]);

  const unitMap = useMemo(() => {
    const map = new Map<string, string>();
    (unitsQuery.data?.items ?? []).forEach((u) => map.set(u.id, u.symbol));
    return map;
  }, [unitsQuery.data]);

  const memberIds = useMemo(() => new Set(localItems.map((i) => i.attribute_definition_id)), [localItems]);

  const availableDefinitions = useMemo(() => {
    const all = definitionsQuery.data?.items ?? [];
    const notMember = all.filter((d) => !memberIds.has(d.id));
    const q = search.trim().toLowerCase();
    if (!q) return notMember;
    return notMember.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  }, [definitionsQuery.data, memberIds, search]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleAdd(definition: AttributeDefinition) {
    if (!id) return;
    const nextSortOrder = localItems.reduce((max, i) => Math.max(max, i.sort_order), -1) + 1;
    createItem.mutate(
      {
        attribute_set_id: id,
        attribute_definition_id: definition.id,
        sort_order: nextSortOrder,
        is_required: false,
        is_visible: true,
      },
      {
        onSuccess: () => message.success(tp("actions.addSuccess")),
        onError: (err) => message.error(extractErrorMessage(err)),
      },
    );
  }

  function handleRemove(item: AttributeSetItem) {
    deleteItem.mutate(item.id, {
      onSuccess: () => message.success(tp("actions.removeSuccess")),
      onError: (err) => message.error(extractErrorMessage(err)),
    });
  }

  function handlePatch(item: AttributeSetItem, patch: Partial<AttributeSetItem>) {
    updateItem.mutate(
      { id: item.id, payload: patch },
      { onError: (err) => message.error(extractErrorMessage(err)) },
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localItems.findIndex((i) => i.id === active.id);
    const newIndex = localItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(reordered);
    reordered.forEach((item, index) => {
      if (item.sort_order !== index) {
        updateItem.mutate(
          { id: item.id, payload: { sort_order: index } },
          { onError: (err) => message.error(extractErrorMessage(err)) },
        );
      }
    });
  }

  const isLoading = setQuery.isLoading || itemsQuery.isLoading || definitionsQuery.isLoading || unitsQuery.isLoading;
  const attributeSet = setQuery.data;
  const mutating = createItem.isPending || updateItem.isPending || deleteItem.isPending;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/catalog/attribute-sets")}>
          {tp("back")}
        </Button>
      </Space>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 20, maxWidth: 480 }} />
      ) : (
        <div style={{ marginBottom: 20 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {attributeSet?.name}{" "}
            <Typography.Text type="secondary" style={{ fontSize: 14, fontWeight: "normal" }}>
              ({attributeSet?.code})
            </Typography.Text>
          </Typography.Title>
          {attributeSet?.description && (
            <Typography.Text type="secondary">{attributeSet.description}</Typography.Text>
          )}
        </div>
      )}

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title={`${tp("inSetTitle")} (${localItems.length})`} size="small">
            {isLoading ? (
              <Skeleton active />
            ) : localItems.length === 0 ? (
              <Empty description={tp("empty")} />
            ) : (
              <div style={{ maxHeight: 560, overflowY: "auto", paddingRight: 4 }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    {localItems.map((item) => {
                      const definition = definitionMap.get(item.attribute_definition_id);
                      const unitSymbol = definition?.unit_id ? unitMap.get(definition.unit_id) : undefined;
                      return (
                        <SortableItemRow
                          key={item.id}
                          item={item}
                          definition={definition}
                          unitSymbol={unitSymbol}
                          busy={mutating}
                          onToggleRequired={(checked) => handlePatch(item, { is_required: checked })}
                          onToggleVisible={(checked) => handlePatch(item, { is_visible: checked })}
                          onDefaultValueCommit={(value) => handlePatch(item, { default_value: value || null })}
                          onRemove={() => handleRemove(item)}
                          tp={tp}
                          t={tCommon}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={tp("availableTitle")} size="small">
            <Input.Search
              placeholder={tp("searchPlaceholder")}
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            {isLoading ? (
              <Skeleton active />
            ) : availableDefinitions.length === 0 ? (
              <Empty description={tp("noAvailable")} />
            ) : (
              <div style={{ maxHeight: 500, overflowY: "auto" }}>
                {availableDefinitions.map((definition) => (
                  <Row
                    key={definition.id}
                    align="middle"
                    justify="space-between"
                    wrap={false}
                    style={{ padding: "8px 4px", borderBottom: "1px solid rgba(128,128,128,0.2)" }}
                  >
                    <Col flex="auto" style={{ minWidth: 0 }}>
                      <Space direction="vertical" size={0} style={{ maxWidth: "100%" }}>
                        <Typography.Text ellipsis>{definition.name}</Typography.Text>
                        <Space size={4}>
                          <Tag>{definition.data_type}</Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {definition.code}
                          </Typography.Text>
                        </Space>
                      </Space>
                    </Col>
                    <Col flex="none">
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<PlusOutlined />}
                        loading={createItem.isPending}
                        onClick={() => handleAdd(definition)}
                      >
                        {tp("actions.add")}
                      </Button>
                    </Col>
                  </Row>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
