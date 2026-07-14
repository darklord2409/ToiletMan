import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { App, Button, Input, Menu, Popconfirm, Space, Table, Typography } from "antd";
import type { InputRef, MenuProps } from "antd";
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { ColumnSettingsButton } from "@/components/ColumnSettingsButton";
import type { ColumnOption } from "@/components/ColumnSettingsButton";
import { EntityFormModal } from "@/components/EntityFormModal";
import type { FormFieldConfig } from "@/components/formTypes";
import { SavedFiltersControl } from "@/components/SavedFiltersControl";
import type { ListParams, createResourceHooks } from "@/hooks/useCrudResource";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import type { SavedFilterPreset } from "@/hooks/useTablePreferences";
import { extractErrorMessage } from "@/api/client";

interface CrudPageProps<T extends { id: string }> {
  title: string;
  description?: string;
  resourceHooks: ReturnType<typeof createResourceHooks<T>>;
  columns: ColumnsType<T>;
  formFields: FormFieldConfig[];
  searchable?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  extraFilters?: ListParams;
  extraToolbar?: ReactNode;
  editValuesTransform?: (item: T) => Record<string, unknown>;
  // Renders extra buttons in each row's action cell, before Edit/Delete —
  // used by entities with bespoke per-row actions beyond plain CRUD (e.g.
  // Products' Archive/Restore/Clone).
  extraRowActions?: (record: T) => ReactNode;
  // Enables checkbox row selection; `selectedRowKeys` must be controlled by
  // the parent so it can drive a bulk-action toolbar.
  rowSelectionEnabled?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (keys: string[], rows: T[]) => void;
}

export function CrudPage<T extends { id: string }>({
  title,
  description,
  resourceHooks,
  columns,
  formFields,
  searchable = true,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  extraFilters,
  extraToolbar,
  editValuesTransform,
  extraRowActions,
  rowSelectionEnabled = false,
  selectedRowKeys,
  onSelectionChange,
}: CrudPageProps<T>) {
  const { message, modal } = App.useApp();
  const { t } = useTranslation("common");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: T } | null>(null);
  const searchInputRef = useRef<InputRef>(null);

  useKeyboardShortcut("n", () => allowCreate && openCreateModal(), allowCreate && !modalOpen);
  useKeyboardShortcut("/", () => searchInputRef.current?.focus(), searchable);

  useEffect(() => {
    if (!contextMenu) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setContextMenu(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [contextMenu]);

  const { hiddenColumns, columnOrder, presets, setLayout, resetLayout, savePreset, removePreset } =
    useTablePreferences(resourceHooks.resourceKey);

  const params: ListParams = {
    page,
    page_size: pageSize,
    search,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...extraFilters,
  };

  const { useList, useCreate, useUpdate, useDelete } = resourceHooks;
  const { data, isLoading, isFetching, isError, error, refetch } = useList(params);
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const deleteMutation = useDelete();

  function openCreateModal() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEditModal(item: T) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleSubmit(values: Record<string, unknown>) {
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, payload: values as Partial<T> },
        {
          onSuccess: () => {
            message.success(t("updateSuccess", { entity: title }));
            setModalOpen(false);
          },
          onError: (err) => message.error(extractErrorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(values as Partial<T>, {
        onSuccess: () => {
          message.success(t("createSuccess", { entity: title }));
          setModalOpen(false);
        },
        onError: (err) => message.error(extractErrorMessage(err)),
      });
    }
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => message.success(t("deleteSuccess")),
      onError: (err) => message.error(extractErrorMessage(err)),
    });
  }

  function contextMenuItems(): MenuProps["items"] {
    const items: MenuProps["items"] = [{ key: "copy-id", label: t("copyId"), icon: <CopyOutlined /> }];
    if (allowEdit) items.push({ key: "edit", label: t("edit"), icon: <EditOutlined /> });
    if (allowDelete) items.push({ key: "delete", label: t("delete"), icon: <DeleteOutlined />, danger: true });
    return items;
  }

  function handleContextMenuClick(key: string, record: T) {
    setContextMenu(null);
    switch (key) {
      case "copy-id":
        void navigator.clipboard.writeText(record.id).then(() => message.success(t("copied")));
        break;
      case "edit":
        openEditModal(record);
        break;
      case "delete":
        modal.confirm({
          title: t("confirmDeleteTitle"),
          content: t("confirmDeleteDescription"),
          okText: t("delete"),
          cancelText: t("cancel"),
          okButtonProps: { danger: true },
          onOk: () => handleDelete(record.id),
        });
        break;
    }
  }

  function applyPreset(preset: SavedFilterPreset) {
    setSearchDraft(preset.search ?? "");
    setSearch(preset.search);
    setSortBy(preset.sortBy);
    setSortOrder(preset.sortOrder ?? "asc");
    setPageSize(preset.pageSize ?? 20);
    setPage(1);
  }

  const actionColumn: ColumnsType<T>[number] = {
    title: t("actions"),
    key: "actions",
    fixed: "right",
    width: 110,
    render: (_, record) => (
      <Space size="small">
        {extraRowActions?.(record)}
        {allowEdit && (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            aria-label={t("ariaEdit")}
          />
        )}
        {allowDelete && (
          <Popconfirm
            title={t("confirmDeleteTitle")}
            description={t("confirmDeleteDescription")}
            onConfirm={() => handleDelete(record.id)}
            okText={t("delete")}
            cancelText={t("cancel")}
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} aria-label={t("ariaDelete")} />
          </Popconfirm>
        )}
      </Space>
    ),
  };

  // Stable per-column identity for layout persistence — falls back to the
  // column's position since not every column config sets an explicit `key`.
  const columnKeys = columns.map((col, index) => String(col.key ?? (col as { dataIndex?: string }).dataIndex ?? index));
  const columnOptions: ColumnOption[] = columns.map((col, index) => ({
    key: columnKeys[index],
    label: typeof col.title === "string" ? col.title : columnKeys[index],
  }));
  const effectiveOrder = columnOrder
    ? [...columnOrder.filter((k) => columnKeys.includes(k)), ...columnKeys.filter((k) => !columnOrder.includes(k))]
    : columnKeys;
  const columnsByKey = new Map(columns.map((col, index) => [columnKeys[index], col]));
  const visibleOrderedColumns = effectiveOrder
    .filter((k) => !hiddenColumns.has(k))
    .map((k) => columnsByKey.get(k))
    .filter((c): c is ColumnsType<T>[number] => Boolean(c));

  const tableColumns =
    allowEdit || allowDelete || extraRowActions
      ? [...visibleOrderedColumns, actionColumn]
      : visibleOrderedColumns;

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total: data?.meta.total_items ?? 0,
    showSizeChanger: true,
    showTotal: (total) => t("totalRecords", { count: total }),
  };

  if (isError) {
    message.error(extractErrorMessage(error));
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {description && <Typography.Text type="secondary">{description}</Typography.Text>}
        </div>
        <Space wrap>
          {extraToolbar}
          <SavedFiltersControl
            presets={presets}
            currentFilter={{ search, sortBy, sortOrder, pageSize }}
            onApply={applyPreset}
            onSave={savePreset}
            onRemove={removePreset}
          />
          {searchable && (
            <Input.Search
              ref={searchInputRef}
              placeholder={t("search")}
              allowClear
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onSearch={(value) => {
                setSearch(value || undefined);
                setPage(1);
              }}
              style={{ width: 240 }}
            />
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
            title={t("refresh")}
            aria-label={t("refresh")}
          />
          {allowCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              {t("new")}
            </Button>
          )}
          <ColumnSettingsButton
            columns={columnOptions}
            hiddenKeys={hiddenColumns}
            order={effectiveOrder}
            onChange={setLayout}
            onReset={resetLayout}
          />
        </Space>
      </div>

      <div
        onContextMenu={(event) => {
          const rowEl = (event.target as HTMLElement).closest("tr[data-row-key]");
          if (!rowEl) return;
          const rowKey = rowEl.getAttribute("data-row-key");
          const record = (data?.items ?? []).find((item) => item.id === rowKey);
          if (!record) return;
          event.preventDefault();
          setContextMenu({ x: event.clientX, y: event.clientY, record });
        }}
      >
        <Table<T>
          rowKey="id"
          columns={tableColumns}
          dataSource={data?.items ?? []}
          loading={isLoading || isFetching}
          pagination={pagination}
          scroll={{ x: "max-content" }}
          rowSelection={
            rowSelectionEnabled
              ? {
                  selectedRowKeys,
                  onChange: (keys, rows) => onSelectionChange?.(keys as string[], rows),
                }
              : undefined
          }
          onChange={(paginationConfig, _filters, sorter) => {
            setPage(paginationConfig.current ?? 1);
            setPageSize(paginationConfig.pageSize ?? 20);
            const s = Array.isArray(sorter) ? sorter[0] : sorter;
            if (s?.field) {
              setSortBy(String(s.field));
              setSortOrder(s.order === "descend" ? "desc" : "asc");
            }
          }}
        />
      </div>

      {contextMenu &&
        createPortal(
          <>
            {/* Rendered to document.body: a position:fixed element nested in
                CrudPage's own tree would instead anchor to the nearest
                transformed/animated antd ancestor (Table/Motion wrappers use
                CSS transforms), landing off-screen instead of at the click
                point. */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: 1049 }}
              onClick={() => setContextMenu(null)}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu(null);
              }}
            />
            <div
              style={{
                position: "fixed",
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: 1050,
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Menu
                items={contextMenuItems()}
                onClick={({ key }) => handleContextMenuClick(key, contextMenu.record)}
              />
            </div>
          </>,
          document.body,
        )}

      {(allowCreate || allowEdit) && (
        <EntityFormModal
          open={modalOpen}
          title={editingItem ? t("editEntity", { entity: title }) : t("newEntity", { entity: title })}
          fields={formFields}
          initialValues={editingItem ? (editValuesTransform?.(editingItem) ?? editingItem) : {}}
          submitting={createMutation.isPending || updateMutation.isPending}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
