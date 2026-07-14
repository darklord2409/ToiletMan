import { useEffect, useMemo, useState } from "react";
import { Input, Menu, Modal } from "antd";
import type { MenuProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import { dashboardNavItem, navGroups } from "@/layout/navConfig";
import type { PaginatedResponse } from "@/types/api";
import type { Customer, Order, Product } from "@/types/entities";

const ALL_NAV_ITEMS = [dashboardNavItem, ...navGroups.flatMap((g) => g.items)];

export function GlobalSearch() {
  const { t } = useTranslation(["nav", "common"]);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isTypingTarget =
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
        !(e.ctrlKey || e.metaKey);
      if (isTypingTarget) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navMatches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return ALL_NAV_ITEMS.slice(0, 8);
    return ALL_NAV_ITEMS.filter((item) =>
      t(item.labelKey, { ns: "nav" }).toLowerCase().includes(trimmed),
    );
  }, [query, t]);

  const deepSearchEnabled = query.trim().length >= 2 && open;

  const productResults = useQuery({
    queryKey: ["global-search-products", query],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", {
        params: { search: query, page_size: 5 },
      });
      return data.items;
    },
    enabled: deepSearchEnabled,
  });

  const orderResults = useQuery({
    queryKey: ["global-search-orders", query],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Order>>("/orders", {
        params: { search: query, page_size: 5 },
      });
      return data.items;
    },
    enabled: deepSearchEnabled,
  });

  const customerResults = useQuery({
    queryKey: ["global-search-customers", query],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Customer>>("/customers", {
        params: { search: query, page_size: 5 },
      });
      return data.items;
    },
    enabled: deepSearchEnabled,
  });

  function close() {
    setOpen(false);
    setQuery("");
  }

  function go(path: string) {
    navigate(path);
    close();
  }

  const items: MenuProps["items"] = [];
  if (navMatches.length > 0) {
    items.push({
      key: "hdr-pages",
      label: t("common:globalSearch.pages"),
      disabled: true,
    });
    navMatches.forEach((item) =>
      items.push({ key: item.path, icon: item.icon, label: t(item.labelKey, { ns: "nav" }) }),
    );
  }
  if (deepSearchEnabled && (productResults.data?.length ?? 0) > 0) {
    items.push({ key: "hdr-products", label: t("common:globalSearch.products"), disabled: true });
    productResults.data!.forEach((p) =>
      items.push({ key: `/catalog/products/${p.id}`, label: `${p.sku} — ${p.name}` }),
    );
  }
  if (deepSearchEnabled && (orderResults.data?.length ?? 0) > 0) {
    items.push({ key: "hdr-orders", label: t("common:globalSearch.orders"), disabled: true });
    orderResults.data!.forEach((o) =>
      items.push({
        key: `/commerce/orders?search=${encodeURIComponent(o.order_number)}`,
        label: o.order_number,
      }),
    );
  }
  if (deepSearchEnabled && (customerResults.data?.length ?? 0) > 0) {
    items.push({ key: "hdr-customers", label: t("common:globalSearch.customers"), disabled: true });
    customerResults.data!.forEach((c) => {
      const display = c.email || c.phone || String(c.telegram_id ?? c.id);
      items.push({
        key: `/users/customers?search=${encodeURIComponent(display)}`,
        label: display,
      });
    });
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        role="button"
        aria-label={t("common:globalSearch.placeholder")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          padding: "5px 12px",
          borderRadius: 6,
          border: "1px solid var(--ant-color-border)",
          color: "var(--ant-color-text-tertiary)",
          fontSize: 13,
          width: "100%",
          minWidth: 0,
        }}
      >
        <SearchOutlined />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t("common:globalSearch.placeholder")}
        </span>
        <span className="global-search-hint" style={{ opacity: 0.6, flexShrink: 0 }}>
          Ctrl+K
        </span>
      </div>

      <Modal
        open={open}
        onCancel={close}
        footer={null}
        closable={false}
        width={640}
        styles={{ body: { padding: 0 } }}
        destroyOnHidden
      >
        <Input
          autoFocus
          size="large"
          variant="borderless"
          prefix={<SearchOutlined />}
          placeholder={t("common:globalSearch.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div
          style={{
            maxHeight: 420,
            overflowY: "auto",
            borderTop: "1px solid var(--ant-color-border-secondary)",
          }}
        >
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", opacity: 0.6 }}>
              {t("common:globalSearch.noResults")}
            </div>
          ) : (
            <Menu
              items={items}
              selectable={false}
              onClick={({ key }) => {
                if (!key.startsWith("hdr-")) go(key);
              }}
              style={{ border: "none" }}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
