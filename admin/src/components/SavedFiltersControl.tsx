import { useState } from "react";
import { App, Button, Dropdown, Input, Popover, Space } from "antd";
import type { MenuProps } from "antd";
import { DeleteOutlined, FilterOutlined, SaveOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import type { SavedFilterPreset } from "@/hooks/useTablePreferences";

interface SavedFiltersControlProps {
  presets: SavedFilterPreset[];
  currentFilter: Omit<SavedFilterPreset, "name">;
  onApply: (preset: SavedFilterPreset) => void;
  onSave: (preset: SavedFilterPreset) => void;
  onRemove: (name: string) => void;
}

export function SavedFiltersControl({
  presets,
  currentFilter,
  onApply,
  onSave,
  onRemove,
}: SavedFiltersControlProps) {
  const { t } = useTranslation("common");
  const { message } = App.useApp();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const menuItems: MenuProps["items"] =
    presets.length === 0
      ? [{ key: "__empty", label: t("table.noPresets"), disabled: true }]
      : presets.map((preset) => ({
          key: preset.name,
          label: (
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <span>{preset.name}</span>
              <DeleteOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(preset.name);
                }}
              />
            </Space>
          ),
        }));

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ name: trimmed, ...currentFilter });
    message.success(t("table.presetSaved"));
    setName("");
    setSaveOpen(false);
  }

  return (
    <Space>
      <Dropdown
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            if (key === "__empty") return;
            const preset = presets.find((p) => p.name === key);
            if (preset) onApply(preset);
          },
        }}
        trigger={["click"]}
      >
        <Button icon={<FilterOutlined />}>{t("table.savedFilters")}</Button>
      </Dropdown>
      <Popover
        open={saveOpen}
        onOpenChange={setSaveOpen}
        trigger="click"
        placement="bottomRight"
        content={
          <Space.Compact>
            <Input
              placeholder={t("table.presetNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPressEnter={handleSave}
              autoFocus
            />
            <Button type="primary" onClick={handleSave}>
              {t("save")}
            </Button>
          </Space.Compact>
        }
      >
        <Button
          icon={<SaveOutlined />}
          title={t("table.saveCurrentFilter")}
          aria-label={t("table.saveCurrentFilter")}
        />
      </Popover>
    </Space>
  );
}
