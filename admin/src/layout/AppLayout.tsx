import { useMemo, useState } from "react";
import { Avatar, Dropdown, Layout, Menu, Switch, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BreadcrumbBar } from "@/layout/BreadcrumbBar";
import { BreadcrumbProvider } from "@/layout/BreadcrumbContext";
import { GlobalSearch } from "@/layout/GlobalSearch";
import { GlobalShortcuts } from "@/layout/GlobalShortcuts";
import { dashboardNavItem, navGroups } from "@/layout/navConfig";
import { NotificationBell } from "@/layout/NotificationBell";
import { OpenTabsProvider } from "@/layout/OpenTabsContext";
import { TabsBar } from "@/layout/TabsBar";
import { useAppTheme } from "@/theme/ThemeContext";

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleDark } = useAppTheme();
  const { t, i18n } = useTranslation(["nav", "common"]);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems: MenuProps["items"] = useMemo(
    () => [
      {
        key: dashboardNavItem.path,
        icon: dashboardNavItem.icon,
        label: <Link to={dashboardNavItem.path}>{t(dashboardNavItem.labelKey, { ns: "nav" })}</Link>,
      },
      ...navGroups.map((group) => ({
        key: group.key,
        label: t(group.labelKey, { ns: "nav" }),
        type: "group" as const,
        children: group.items.map((item) => ({
          key: item.path,
          icon: item.icon,
          label: <Link to={item.path}>{t(item.labelKey, { ns: "nav" })}</Link>,
        })),
      })),
    ],
    // `t`'s reference doesn't change on language switch, so `i18n.language`
    // must stay a dep to force the sidebar labels to re-translate — despite
    // the lint rule reading it as unused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );

  const selectedKey =
    [...navGroups.flatMap((g) => g.items), dashboardNavItem]
      .map((item) => item.path)
      .filter((path) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path)))
      .sort((a, b) => b.length - a.length)[0] ?? "/";

  const userMenuItems: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("common:logout"),
      onClick: () => {
        void logout().then(() => navigate("/login"));
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <GlobalShortcuts />
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 99,
          }}
        />
      )}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80}
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          setCollapsed(broken);
        }}
        width={240}
        style={{
          overflow: "auto",
          height: "100vh",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? 0 : "0 16px",
            color: "#fff",
            fontWeight: 700,
            fontSize: collapsed ? 16 : 18,
            letterSpacing: 0.5,
          }}
        >
          {collapsed ? "TB" : "TipoBot Admin"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={() => isMobile && setCollapsed(true)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--ant-color-bg-container)",
            borderBottom: "1px solid var(--ant-color-border-secondary)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{ fontSize: 18, cursor: "pointer" }}
            onClick={() => setCollapsed((prev) => !prev)}
            role="button"
            aria-label={t("common:ariaToggleSidebar")}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <div
            data-testid="header-search-trigger"
            style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center", maxWidth: 480 }}
          >
            <GlobalSearch />
          </div>

          <div
            className="admin-header-actions"
            data-testid="header-actions"
            style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}
          >
            <LanguageSwitcher />
            <Switch
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={isDark}
              onChange={toggleDark}
              aria-label={t("common:ariaToggleDarkMode")}
            />
            <NotificationBell />
            <Dropdown menu={{ items: userMenuItems }} trigger={["click"]} placement="bottomRight">
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Typography.Text className="admin-user-name" style={{ maxWidth: 140 }} ellipsis>
                  {user?.full_name || user?.username}
                </Typography.Text>
              </div>
            </Dropdown>
          </div>
        </Header>

        <BreadcrumbProvider>
          <OpenTabsProvider>
            <TabsBar />
            <BreadcrumbBar />
            <Content style={{ margin: 20 }}>
              <Outlet />
            </Content>
          </OpenTabsProvider>
        </BreadcrumbProvider>
      </Layout>
    </Layout>
  );
}
