// Mirrors backend Pydantic schemas (see backend/app/schemas). Pydantic v2
// serializes Decimal fields as JSON strings (to preserve precision), so
// every money/quantity-decimal field here is typed `string`, not `number` —
// parse with Number()/parseFloat() only at the point of arithmetic or
// formatting (see @/lib/format.ts).

export type AttributeDataType = "string" | "number" | "boolean" | "date" | "reference";
export type ProductStatus = "draft" | "active" | "archived";
export type ProductDocumentType =
  | "manual"
  | "certificate"
  | "warranty_card"
  | "installation_instructions"
  | "exploded_diagram";
export type ProductVideoType = "youtube" | "mp4" | "external";
export type DeliveryMethod = "pickup" | "delivery";
export type PaymentMethod = "cash";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type AvailabilityStatus = "unlimited" | "out_of_stock" | "low_stock" | "in_stock";

export interface Translations {
  [locale: string]: Record<string, unknown>;
}

export interface ProductRead {
  id: string;
  created_at: string;
  updated_at: string;
  category_id: string;
  manufacturer_id: string | null;
  unit_id: string;
  product_type_id: string;
  collection_id: string | null;
  sku: string;
  barcode: string | null;
  slug: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  is_featured: boolean;
  weight_kg: string | null;
  price: string;
  compare_at_price: string | null;
  cost_price: string | null;
  sale_price: string | null;
  future_price: string | null;
  future_price_activates_at: string | null;
  currency: string;
  stock_quantity: number;
  reserved_quantity: number;
  is_unlimited_stock: boolean;
  low_stock_threshold: number | null;
  canonical_url_override: string | null;
  seo: Record<string, unknown> | null;
  translations: Translations;
  available_quantity: number;
  availability_status: AvailabilityStatus;
}

export interface ProductListItem extends ProductRead {
  primary_image_url: string | null;
}

export interface ProductSummary {
  id: string;
  sku: string;
  slug: string;
  name: string;
  price: string;
  compare_at_price: string | null;
  primary_image_url: string | null;
  availability_status: AvailabilityStatus;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_featured: boolean;
  image_url: string | null;
  children: CategoryTreeNode[];
}

export interface ManufacturerRead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
}

export interface CollectionRead {
  id: string;
  created_at: string;
  updated_at: string;
  manufacturer_id: string;
  code: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  translations: Translations;
}

export interface ProductTypeRead {
  id: string;
  created_at: string;
  updated_at: string;
  attribute_set_id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  translations: Translations;
}

export interface ProductLabelRead {
  id: string;
  created_at: string;
  updated_at: string;
  code: string;
  badge_color: string | null;
  sort_order: number;
  is_active: boolean;
  translations: Translations;
}

export interface ProductImageRead {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductDocumentRead {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  document_type: ProductDocumentType;
  title: string;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
}

export interface ProductVideoRead {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  video_type: ProductVideoType;
  title: string | null;
  url: string;
  thumbnail_url: string | null;
  sort_order: number;
}

export interface ResolvedReferenceValue {
  id: string;
  code: string;
  translations: Translations;
}

export interface ResolvedAttribute {
  attribute_definition_id: string;
  code: string;
  name: string;
  translations: Translations;
  data_type: AttributeDataType;
  unit_symbol: string | null;
  value_string: string | null;
  value_number: string | null;
  value_boolean: boolean | null;
  value_date: string | null;
  reference_value: ResolvedReferenceValue | null;
}

export interface ResolvedLabel {
  id: string;
  code: string;
  badge_color: string | null;
  translations: Translations;
}

export interface ProductRecommendations {
  frequently_bought_together: ProductListItem[];
  accessories: ProductListItem[];
  related: ProductListItem[];
  same_collection: ProductListItem[];
  similar: ProductListItem[];
}

export interface ProductDetailResponse {
  product: ProductRead;
  images: ProductImageRead[];
  documents: ProductDocumentRead[];
  videos: ProductVideoRead[];
  attributes: ResolvedAttribute[];
  labels: ResolvedLabel[];
  recommendations: ProductRecommendations;
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

export interface CartItemResponse {
  id: string;
  product_id: string;
  product: ProductSummary;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  item_count: number;
  subtotal: string;
}

export interface FavoriteResponse {
  id: string;
  product: ProductSummary;
  created_at: string;
}

export interface BannerRead {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface PublicStoreSettings {
  store_name: string;
  logo_url: string | null;
  phone: string | null;
  telegram_url: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  address: string | null;
  working_hours: Record<string, unknown> | null;
  delivery_info: string | null;
  currency: string;
  default_language: string;
  support_email: string | null;
  support_phone: string | null;
  about_text: Record<string, string> | null;
}

export interface CustomerRead {
  id: string;
  created_at: string;
  updated_at: string;
  telegram_id: number | null;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  language: string;
  notifications_enabled: boolean;
}

export interface OrderItemRead {
  id: string;
  created_at: string;
  updated_at: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface OrderRead {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  coupon_id: string | null;
  order_number: string;
  status: OrderStatus;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  shipping_total: string;
  grand_total: string;
  currency: string;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  notes: string | null;
  manager_notes: string | null;
  delivery_method: DeliveryMethod | null;
  payment_method: PaymentMethod | null;
  contact_name: string | null;
  contact_phone: string | null;
}

export interface OrderDetailResponse extends OrderRead {
  items: OrderItemRead[];
}

export interface CheckoutRequest {
  contact_name: string;
  contact_phone: string;
  delivery_method: DeliveryMethod;
  address?: string | null;
  comment?: string | null;
}
