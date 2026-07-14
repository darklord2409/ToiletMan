import { Tabs, Tooltip, theme } from "antd";
import type { TabsProps } from "antd";
import { PushpinFilled, PushpinOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { dashboardNavItem } from "@/layout/navConfig";
import { useOpenTabs } from "@/layout/OpenTabsContext";

export function TabsBar() {
  const { t } = useTranslation(["nav", "common"]);
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { tabs, activePath, closeTab, togglePin } = useOpenTabs();

  if (tabs.length === 0) return null;

  const items: TabsProps["items"] = tabs.map((tab) => {
    const isDashboard = tab.path === dashboardNavItem.path;
    const text = tab.extra ? `${t(tab.labelKey)}: ${tab.extra}` : t(tab.labelKey);
    return {
      key: tab.path,
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {!isDashboard && (
            <Tooltip title={tab.pinned ? t("common:unpinTab") : t("common:pinTab")}>
              <span
                role="button"
                aria-label={tab.pinned ? "unpin tab" : "pin tab"}
                data-testid="tab-pin-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(tab.path);
                }}
                style={{
                  display: "inline-flex",
                  cursor: "pointer",
                  color: tab.pinned ? token.colorPrimary : token.colorTextQuaternary,
                }}
              >
                {tab.pinned ? <PushpinFilled /> : <PushpinOutlined />}
              </span>
            </Tooltip>
          )}
          <span style={{ fontStyle: !tab.pinned && !isDashboard ? "italic" : "normal" }}>{text}</span>
        </span>
      ),
      closable: !isDashboard,
    };
  });

  return (
    <Tabs
      type="editable-card"
      hideAdd
      size="small"
      activeKey={tabs.some((tab) => tab.path === activePath) ? activePath : undefined}
      items={items}
      onChange={(key) => navigate(key)}
      onEdit={(key, action) => {
        if (action === "remove" && typeof key === "string") closeTab(key);
      }}
      style={{ margin: "8px 20px 0" }}
    />
  );
}
