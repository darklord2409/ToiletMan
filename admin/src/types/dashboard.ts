// Mirrors backend/app/schemas/system/dashboard.py

export interface DashboardTopProduct {
  product_id: string | null;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: string;
}

export interface DashboardSummary {
  revenue_total: string;
  revenue_last_30_days: string;
  orders_total: number;
  orders_by_status: Record<string, number>;
  products_total: number;
  products_active: number;
  customers_total: number;
  low_stock_count: number;
  out_of_stock_count: number;
  top_products: DashboardTopProduct[];
}

export interface DashboardSalesPoint {
  date: string;
  revenue: string;
  order_count: number;
}

export interface DashboardSalesSeries {
  points: DashboardSalesPoint[];
}

export interface ProductAnalyticsRow {
  product_id: string;
  name: string;
  sku: string;
  count: number;
}

export interface CategoryAnalyticsRow {
  category_id: string;
  name: string;
  count: number;
}

export interface CollectionAnalyticsRow {
  collection_id: string;
  name: string;
  count: number;
}

export interface AnalyticsSummary {
  most_viewed_products: ProductAnalyticsRow[];
  most_favorited_products: ProductAnalyticsRow[];
  most_added_to_cart_products: ProductAnalyticsRow[];
  most_requested_products: ProductAnalyticsRow[];
  popular_collections: CollectionAnalyticsRow[];
  popular_categories: CategoryAnalyticsRow[];
}
