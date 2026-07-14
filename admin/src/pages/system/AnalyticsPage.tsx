import { useQuery } from "@tanstack/react-query";
import { Card, Col, Empty, Row, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { apiClient } from "@/api/client";
import type {
  AnalyticsSummary,
  CategoryAnalyticsRow,
  CollectionAnalyticsRow,
  ProductAnalyticsRow,
} from "@/types/dashboard";

export default function AnalyticsPage() {
  const { t } = useTranslation(["dashboard"]);
  const ta = (key: string) => t(`analytics.${key}`, { ns: "dashboard" });

  const analyticsQuery = useQuery({
    queryKey: ["dashboard", "analytics"],
    queryFn: async () => {
      const { data } = await apiClient.get<AnalyticsSummary>("/dashboard/analytics");
      return data;
    },
  });

  const productColumns: ColumnsType<ProductAnalyticsRow> = [
    { title: ta("columns.sku"), dataIndex: "sku" },
    { title: ta("columns.product"), dataIndex: "name" },
    { title: ta("columns.views"), dataIndex: "count", align: "right" },
  ];

  const collectionColumns: ColumnsType<CollectionAnalyticsRow> = [
    { title: ta("columns.collection"), dataIndex: "name" },
    { title: ta("columns.views"), dataIndex: "count", align: "right" },
  ];

  const categoryColumns: ColumnsType<CategoryAnalyticsRow> = [
    { title: ta("columns.category"), dataIndex: "name" },
    { title: ta("columns.views"), dataIndex: "count", align: "right" },
  ];

  const widgets: {
    key: string;
    titleKey: string;
    emptyKey: string;
    columns: ColumnsType<ProductAnalyticsRow>;
    data: ProductAnalyticsRow[] | undefined;
    rowKey: (record: ProductAnalyticsRow) => string;
  }[] = [
    {
      key: "mostViewed",
      titleKey: "mostViewed",
      emptyKey: "mostViewed",
      columns: productColumns,
      data: analyticsQuery.data?.most_viewed_products,
      rowKey: (record) => record.product_id,
    },
    {
      key: "mostFavorited",
      titleKey: "mostFavorited",
      emptyKey: "mostFavorited",
      columns: productColumns,
      data: analyticsQuery.data?.most_favorited_products,
      rowKey: (record) => record.product_id,
    },
    {
      key: "mostAddedToCart",
      titleKey: "mostAddedToCart",
      emptyKey: "mostAddedToCart",
      columns: productColumns,
      data: analyticsQuery.data?.most_added_to_cart_products,
      rowKey: (record) => record.product_id,
    },
    {
      key: "mostRequested",
      titleKey: "mostRequested",
      emptyKey: "mostRequested",
      columns: productColumns,
      data: analyticsQuery.data?.most_requested_products,
      rowKey: (record) => record.product_id,
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {ta("title")}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{ta("description")}</Typography.Paragraph>

      <Row gutter={[16, 16]}>
        {widgets.map((widget) => (
          <Col xs={24} lg={12} key={widget.key}>
            <Card title={ta(`${widget.titleKey}.title`)}>
              <Table<ProductAnalyticsRow>
                rowKey={widget.rowKey}
                size="small"
                pagination={false}
                loading={analyticsQuery.isLoading}
                columns={widget.columns}
                dataSource={widget.data ?? []}
                locale={{
                  emptyText: (
                    <Empty
                      description={ta(`${widget.emptyKey}.empty`)}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
              />
            </Card>
          </Col>
        ))}

        <Col xs={24} lg={12}>
          <Card title={ta("popularCollections.title")}>
            <Table<CollectionAnalyticsRow>
              rowKey={(record) => record.collection_id}
              size="small"
              pagination={false}
              loading={analyticsQuery.isLoading}
              columns={collectionColumns}
              dataSource={analyticsQuery.data?.popular_collections ?? []}
              locale={{
                emptyText: (
                  <Empty description={ta("popularCollections.empty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={ta("popularCategories.title")}>
            <Table<CategoryAnalyticsRow>
              rowKey={(record) => record.category_id}
              size="small"
              pagination={false}
              loading={analyticsQuery.isLoading}
              columns={categoryColumns}
              dataSource={analyticsQuery.data?.popular_categories ?? []}
              locale={{
                emptyText: (
                  <Empty description={ta("popularCategories.empty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
