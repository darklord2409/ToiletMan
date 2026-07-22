// Mirrors backend Pydantic response shapes used by the public website.
// Kept intentionally minimal -- only fields this app actually reads.

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_featured: boolean;
  image_url: string | null;
  children: CategoryTreeNode[];
}

export interface ProductTranslation {
  name?: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
}

export interface ProductListItem {
  id: string;
  category_id: string;
  manufacturer_id: string | null;
  product_type_id: string;
  sku: string;
  slug: string;
  name: string;
  description: string | null;
  price: string;
  compare_at_price: string | null;
  currency: string;
  canonical_url_override: string | null;
  translations: Record<string, ProductTranslation>;
  available_quantity: number;
  availability_status: "unlimited" | "in_stock" | "low_stock" | "out_of_stock";
  primary_image_url: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ResolvedAttribute {
  attribute_definition_id: string;
  code: string;
  name: string;
  translations: Record<string, { name: string }>;
  data_type: string;
  unit_symbol: string | null;
  value_string: string | null;
  value_number: string | null;
  value_boolean: boolean | null;
  value_date: string | null;
  reference_value: { id: string; code: string; translations: Record<string, { name: string }> } | null;
}

export interface ProductRecommendations {
  frequently_bought_together: ProductListItem[];
  accessories: ProductListItem[];
  related: ProductListItem[];
  same_collection: ProductListItem[];
  similar: ProductListItem[];
}

export interface ProductDetailResponse {
  product: ProductListItem;
  images: ProductImage[];
  documents: unknown[];
  videos: unknown[];
  attributes: ResolvedAttribute[];
  labels: { id: string; code: string; badge_color: string | null; translations: Record<string, { name: string }> }[];
  recommendations: ProductRecommendations;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
}

export interface PublicStoreSettings {
  store_name: string;
  logo_url: string | null;
  phone: string | null;
  telegram_url: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  address: string | null;
  working_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  delivery_info: string | null;
  about_text: Record<string, string> | null;
  currency: string;
  default_language: string;
  support_email: string | null;
  support_phone: string | null;
}

export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSummary {
  id: string;
  sku: string;
  slug: string;
  name: string;
  price: string;
  compare_at_price: string | null;
  primary_image_url: string | null;
  availability_status: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product: ProductSummary;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  item_count: number;
  subtotal: string;
}

export type DeliveryMethod = "pickup" | "delivery";

export interface CheckoutRequest {
  contact_name: string;
  contact_phone: string;
  delivery_method: DeliveryMethod;
  address?: string;
  comment?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  shipping_total: string;
  grand_total: string;
  currency: string;
  delivery_method: DeliveryMethod | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
}

export interface Customer {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  language: string | null;
}

export interface CatalogFilterFacet {
  id: string;
  name: string;
  count: number;
}

export interface CatalogFiltersResponse {
  price_min: string | null;
  price_max: string | null;
  manufacturers: CatalogFilterFacet[];
  collections: CatalogFilterFacet[];
  categories: CatalogFilterFacet[];
}
