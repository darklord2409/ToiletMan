import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Col,
  Empty,
  List,
  Row,
  Segmented,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ShopOutlined,
  ShoppingCartOutlined,
  StopOutlined,
  TeamOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiClient } from "@/api/client";
import { useAppTheme } from "@/theme/ThemeContext";
import type { PaginatedResponse } from "@/types/api";
import type { AuditLog, AvailabilityStatus, Product, ProductStatus } from "@/types/entities";
import type { DashboardSalesSeries, DashboardSummary, DashboardTopProduct } from "@/types/dashboard";

dayjs.extend(relativeTime);

const PRIMARY_COLOR = "#2563eb";

const ORDER_STATUS_SEQUENCE = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

const orderStatusColor: Record<string, string> = {
  pending: "gold",
  confirmed: "blue",
  processing: "geekblue",
  shipped: "cyan",
  delivered: "green",
  cancelled: "red",
  refunded: "volcano",
};

const productStatusColor: Record<ProductStatus, string> = {
  draft: "default",
  active: "green",
  archived: "red",
};

const availabilityColor: Record<AvailabilityStatus, string> = {
  in_stock: "green",
  low_stock: "gold",
  out_of_stock: "red",
  unlimited: "blue",
};

type DayRange = 7 | 30 | 90;

function formatCurrency(value: string | number | undefined | null): string {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} UZS`;
}

interface ChartPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export default function DashboardPage() {
  const { t } = useTranslation(["dashboard", "common", "notifications", "system"]);
  const navigate = useNavigate();
  const { isDark } = useAppTheme();
  const [days, setDays] = useState<DayRange>(30);

  const gridColor = isDark ? "#303030" : "#f0f0f0";
  const axisColor = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";
  const tooltipBg = isDark ? "#1f1f1f" : "#ffffff";
  const tooltipBorder = isDark ? "#424242" : "#f0f0f0";

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary");
      return data;
    },
  });

  const salesQuery = useQuery({
    queryKey: ["dashboard", "sales-series", days],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSalesSeries>("/dashboard/sales-series", {
        params: { days },
      });
      return data;
    },
  });

  const recentActivity = useQuery({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AuditLog>>("/audit-logs", {
        params: { page: 1, page_size: 10, sort_by: "created_at", sort_order: "desc" },
      });
      return data.items;
    },
  });

  const latestProducts = useQuery({
    queryKey: ["dashboard", "latest-products"],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", {
        params: { page: 1, page_size: 5, sort_by: "created_at", sort_order: "desc" },
      });
      return data.items;
    },
  });

  const lowStockProducts = useQuery({
    queryKey: ["dashboard", "low-stock-products"],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", {
        params: { page: 1, page_size: 5, sort_by: "stock_quantity", sort_order: "asc" },
      });
      return data.items;
    },
  });

  const chartData = useMemo<ChartPoint[]>(() => {
    const points = salesQuery.data?.points ?? [];
    const byDate = new Map(points.map((p) => [p.date, p]));
    const result: ChartPoint[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = dayjs().subtract(i, "day");
      const key = d.format("YYYY-MM-DD");
      const point = byDate.get(key);
      result.push({
        date: key,
        label: d.format("DD.MM"),
        revenue: point ? Number(point.revenue) : 0,
        orders: point ? point.order_count : 0,
      });
    }
    return result;
  }, [salesQuery.data, days]);

  const orderStatusEntries = ORDER_STATUS_SEQUENCE.map(
    (status) => [status, summaryQuery.data?.orders_by_status?.[status] ?? 0] as const,
  ).filter(([, count]) => count > 0);

  const popularProductColumns: ColumnsType<DashboardTopProduct> = [
    { title: t("columns.sku"), dataIndex: "sku" },
    { title: t("columns.name"), dataIndex: "name" },
    { title: t("columns.quantitySold"), dataIndex: "quantity_sold", align: "right" },
    {
      title: t("columns.revenue"),
      dataIndex: "revenue",
      align: "right",
      render: (v: string) => formatCurrency(v),
    },
  ];

  const latestProductColumns: ColumnsType<Product> = [
    { title: t("columns.sku"), dataIndex: "sku" },
    { title: t("columns.name"), dataIndex: "name" },
    {
      title: t("columns.price"),
      dataIndex: "price",
      align: "right",
      render: (v: string, record) => `${Number(v).toLocaleString("ru-RU")} ${record.currency}`,
    },
    {
      title: t("columns.status"),
      dataIndex: "status",
      render: (s: ProductStatus) => (
        <Tag color={productStatusColor[s]}>{t(`common:productStatus.${s}`, s)}</Tag>
      ),
    },
  ];

  const lowStockColumns: ColumnsType<Product> = [
    { title: t("columns.sku"), dataIndex: "sku" },
    { title: t("columns.name"), dataIndex: "name" },
    { title: t("columns.stock"), dataIndex: "stock_quantity", align: "right" },
    {
      title: t("columns.status"),
      dataIndex: "availability_status",
      render: (s: AvailabilityStatus) => (
        <Tag color={availabilityColor[s]}>{t(`common:availabilityStatus.${s}`, s)}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {t("title")}
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title={t("stats.revenue")}
              value={Math.round(Number(summaryQuery.data?.revenue_last_30_days ?? 0))}
              loading={summaryQuery.isLoading}
              suffix="UZS"
              groupSeparator=" "
              prefix={
                <span style={{ color: PRIMARY_COLOR }}>
                  <WalletOutlined />
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title={t("stats.orders")}
              value={summaryQuery.data?.orders_total ?? 0}
              loading={summaryQuery.isLoading}
              prefix={
                <span style={{ color: "#16a34a" }}>
                  <ShoppingCartOutlined />
                </span>
              }
            />
            <div style={{ marginTop: 8, minHeight: 24 }}>
              {orderStatusEntries.length > 0 ? (
                <Space size={[4, 4]} wrap>
                  {orderStatusEntries.map(([status, count]) => (
                    <Tag key={status} color={orderStatusColor[status] ?? "default"}>
                      {t(`common:orderStatus.${status}`, status)}: {count}
                    </Tag>
                  ))}
                </Space>
              ) : (
                !summaryQuery.isLoading && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {t("stats.noOrders")}
                  </Typography.Text>
                )
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title={t("stats.products")}
              value={summaryQuery.data?.products_total ?? 0}
              loading={summaryQuery.isLoading}
              prefix={
                <span style={{ color: "#7c3aed" }}>
                  <ShopOutlined />
                </span>
              }
            />
            {!summaryQuery.isLoading && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t("stats.activeCount", { n: summaryQuery.data?.products_active ?? 0 })}
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate("/users/customers")} style={{ cursor: "pointer" }}>
            <Statistic
              title={t("stats.customers")}
              value={summaryQuery.data?.customers_total ?? 0}
              loading={summaryQuery.isLoading}
              prefix={
                <span style={{ color: "#d97706" }}>
                  <TeamOutlined />
                </span>
              }
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("stats.viewAllCustomers")}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            onClick={() => navigate("/catalog/products?availability_status=low_stock")}
            style={{ cursor: "pointer" }}
          >
            <Statistic
              title={t("stats.lowStock")}
              value={summaryQuery.data?.low_stock_count ?? 0}
              loading={summaryQuery.isLoading}
              valueStyle={(summaryQuery.data?.low_stock_count ?? 0) > 0 ? { color: "#d97706" } : undefined}
              prefix={
                <span style={{ color: "#d97706" }}>
                  <WarningOutlined />
                </span>
              }
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("stats.viewAll")}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            onClick={() => navigate("/catalog/products?availability_status=out_of_stock")}
            style={{ cursor: "pointer" }}
          >
            <Statistic
              title={t("stats.outOfStock")}
              value={summaryQuery.data?.out_of_stock_count ?? 0}
              loading={summaryQuery.isLoading}
              valueStyle={(summaryQuery.data?.out_of_stock_count ?? 0) > 0 ? { color: "#dc2626" } : undefined}
              prefix={
                <span style={{ color: "#dc2626" }}>
                  <StopOutlined />
                </span>
              }
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("stats.viewAll")}
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title={t("sales.title")}
            extra={
              <Segmented<DayRange>
                value={days}
                onChange={(value) => setDays(value)}
                options={[
                  { label: t("sales.rangeDays", { n: 7 }), value: 7 },
                  { label: t("sales.rangeDays", { n: 30 }), value: 30 },
                  { label: t("sales.rangeDays", { n: 90 }), value: 90 },
                ]}
              />
            }
          >
            {salesQuery.isLoading ? (
              <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spin />
              </div>
            ) : (salesQuery.data?.points.length ?? 0) === 0 ? (
              <Empty description={t("sales.empty")} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "48px 0" }} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: axisColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: axisColor }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: axisColor }}
                    formatter={(value, name) => {
                      if (name === "revenue") return [formatCurrency(Number(value)), t("sales.revenueLabel")];
                      return [String(value), t("sales.ordersLabel")];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke={PRIMARY_COLOR}
                    strokeWidth={2}
                    fill="url(#dashboardRevenueGradient)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title={t("popularProducts.title")} style={{ marginTop: 16 }}>
            <Table<DashboardTopProduct>
              rowKey={(record) => record.product_id ?? record.sku}
              size="small"
              pagination={false}
              loading={summaryQuery.isLoading}
              columns={popularProductColumns}
              dataSource={summaryQuery.data?.top_products ?? []}
              locale={{
                emptyText: (
                  <Empty description={t("popularProducts.empty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={t("notifications:recentActivity")}>
            {recentActivity.isLoading ? (
              <div style={{ textAlign: "center", padding: 24 }}>
                <Spin size="small" />
              </div>
            ) : (recentActivity.data?.length ?? 0) === 0 ? (
              <Empty description={t("notifications:noRecentActivity")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={recentActivity.data ?? []}
                renderItem={(log) => (
                  <List.Item style={{ padding: "6px 0" }}>
                    <List.Item.Meta
                      title={
                        <span style={{ fontSize: 13 }}>
                          {t(`system:auditLogs.actions.${log.action}`, { defaultValue: log.action })}
                          {" · "}
                          {t(`system:auditLogs.entityTypes.${log.entity_type}`, { defaultValue: log.entity_type })}
                        </span>
                      }
                      description={<span style={{ fontSize: 12 }}>{dayjs(log.created_at).fromNow()}</span>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card title={t("latestProducts.title")} style={{ marginTop: 16 }}>
            <Table<Product>
              rowKey="id"
              size="small"
              pagination={false}
              loading={latestProducts.isLoading}
              columns={latestProductColumns}
              dataSource={latestProducts.data ?? []}
            />
          </Card>

          <Card title={t("lowestStockProducts")} style={{ marginTop: 16 }}>
            <Table<Product>
              rowKey="id"
              size="small"
              pagination={false}
              loading={lowStockProducts.isLoading}
              columns={lowStockColumns}
              dataSource={lowStockProducts.data ?? []}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
