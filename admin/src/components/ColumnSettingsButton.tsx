import { useState } from "react";
import { Button, Checkbox, Popover, Typography } from "antd";
import { HolderOutlined, SettingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnSettingsButtonProps {
  columns: ColumnOption[];
  hiddenKeys: Set<string>;
  order: string[];
  onChange: (next: { hiddenColumns: string[]; columnOrder: string[] }) => void;
  onReset: () => void;
}

function SortableRow({
  option,
  checked,
  onToggle,
}: {
  option: ColumnOption;
  checked: boolean;
  onToggle: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.key,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
        opacity: isDragging ? 0.5 : 1,
        background: "var(--ant-color-bg-container)",
      }}
    >
      <span {...attributes} {...listeners} style={{ cursor: "grab", color: "var(--ant-color-text-tertiary)" }}>
        <HolderOutlined />
      </span>
      <Checkbox checked={checked} onChange={() => onToggle(option.key)}>
        {option.label}
      </Checkbox>
    </div>
  );
}

export function ColumnSettingsButton({ columns, hiddenKeys, order, onChange, onReset }: ColumnSettingsButtonProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const byKey = new Map(columns.map((c) => [c.key, c]));
  const orderedOptions = order.map((k) => byKey.get(k)).filter((c): c is ColumnOption => Boolean(c));

  function toggle(key: string) {
    const next = new Set(hiddenKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ hiddenColumns: [...next], columnOrder: order });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onChange({ hiddenColumns: [...hiddenKeys], columnOrder: arrayMove(order, oldIndex, newIndex) });
  }

  const content = (
    <div style={{ width: 240 }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {orderedOptions.map((option) => (
            <SortableRow
              key={option.key}
              option={option}
              checked={!hiddenKeys.has(option.key)}
              onToggle={toggle}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="link" size="small" style={{ padding: "4px 0" }} onClick={onReset}>
        {t("table.resetColumns")}
      </Button>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      title={<Typography.Text strong>{t("table.columns")}</Typography.Text>}
      content={content}
    >
      <Button icon={<SettingOutlined />} title={t("table.columns")} aria-label={t("table.columns")} />
    </Popover>
  );
}
