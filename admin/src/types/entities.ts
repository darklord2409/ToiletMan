// Mirrors backend/app/models/enums.py
export type AttributeDataType = "string" | "number" | "boolean" | "date" | "reference";
export type ProductStatus = "draft" | "active" | "archived";
export type AvailabilityStatus = "unlimited" | "out_of_stock" | "low_stock" | "in_stock";
export type ProductDocumentType =
  | "manual"
  | "certificate"
  | "warranty_card"
  | "installation_instructions"
  | "exploded_diagram";
export type ProductVideoType = "youtube" | "mp4" | "external";
// Known reference_type values for ReferenceValue.reference_type (backend/app/models/catalog/reference_value.py)
export type ReferenceValueType =
  | "material"
  | "color"
  | "country"
  | "finish"
  | "installation_type"
  | "shape"
  | "warranty_period"
  | "connection_type"
  | "thread_size"
  | "water_outlet_type";
export type CartStatus = "active" | "converted" | "abandoned";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type PromotionType = "percentage" | "fixed_amount" | "buy_x_get_y";
export type DiscountScope = "product" | "category" | "cart" | "shipping";
export type AmountType = "percentage" | "fixed_amount";
export type ActorType = "customer" | "admin_user" | "system";
export type DeliveryMethod = "pickup" | "delivery";
export type PaymentMethod = "cash";
export type RecommendationType = "related" | "accessory" | "frequently_bought_together";

interface Timestamped {
  id: string;
  created_at: string;
  updated_at: string;
}

// --- Catalog ---
export interface Manufacturer extends Timestamped {
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
}

export interface Unit extends Timestamped {
  name: string;
  symbol: string;
  is_active: boolean;
}

export interface Category extends Timestamped {
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  image_url: string | null;
}

export interface ProductTranslation {
  name?: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
}

export interface Product extends Timestamped {
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
  translations: Record<string, ProductTranslation>;
  // Response-only computed fields — never sent on create/update.
  available_quantity: number;
  availability_status: AvailabilityStatus;
}

export interface ProductImage extends Timestamped {
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface AttributeDefinition extends Timestamped {
  unit_id: string | null;
  attribute_group_id: string | null;
  code: string;
  name: string;
  data_type: AttributeDataType;
  reference_type: string | null;
  is_filterable: boolean;
  validation_regex: string | null;
  min_value: string | null;
  max_value: string | null;
  translations: Record<string, NameTranslation>;
}

export interface ProductAttribute extends Timestamped {
  product_id: string;
  attribute_definition_id: string;
  value_string: string | null;
  value_number: string | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_reference_id: string | null;
}

export interface AttributeSet extends Timestamped {
  code: string;
  name: string;
  description: string | null;
}

export interface AttributeSetItem extends Timestamped {
  attribute_set_id: string;
  attribute_definition_id: string;
  sort_order: number;
  is_required: boolean;
  is_visible: boolean;
  default_value: string | null;
}

export interface NameTranslation {
  name?: string;
}

export interface ProductType extends Timestamped {
  attribute_set_id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  default_image_url: string | null;
  translations: Record<string, NameTranslation>;
}

export interface AttributeGroup extends Timestamped {
  code: string;
  name: string;
  sort_order: number;
  translations: Record<string, NameTranslation>;
}

export interface ReferenceValue extends Timestamped {
  reference_type: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  translations: Record<string, NameTranslation>;
}

export interface Collection extends Timestamped {
  manufacturer_id: string;
  code: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  translations: Record<string, { name?: string; description?: string }>;
}

export interface ProductLabel extends Timestamped {
  code: string;
  badge_color: string | null;
  sort_order: number;
  is_active: boolean;
  translations: Record<string, NameTranslation>;
}

export interface ProductLabelAssignment extends Timestamped {
  product_id: string;
  product_label_id: string;
}

export interface ProductRecommendation extends Timestamped {
  product_id: string;
  recommended_product_id: string;
  relation_type: RecommendationType;
  sort_order: number;
}

export interface ProductDocument extends Timestamped {
  product_id: string;
  document_type: ProductDocumentType;
  title: string;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
}

export interface ProductVideo extends Timestamped {
  product_id: string;
  video_type: ProductVideoType;
  title: string | null;
  url: string;
  thumbnail_url: string | null;
  sort_order: number;
}

// --- Users ---
export interface Customer extends Timestamped {
  telegram_id: number | null;
  telegram_username: string | null;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  language: string;
  notifications_enabled: boolean;
}

export interface AdminUser extends Timestamped {
  role_id: string | null;
  username: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  last_login_at: string | null;
}

export interface AdminSession {
  jti: string;
  created_at: string | null;
  user_agent: string | null;
  ip_address: string | null;
}

export interface Role extends Timestamped {
  name: string;
  description: string | null;
}

export interface Permission extends Timestamped {
  code: string;
  description: string | null;
}

export interface RolePermission extends Timestamped {
  role_id: string;
  permission_id: string;
}

// --- Commerce ---
export interface Cart extends Timestamped {
  customer_id: string | null;
  session_token: string | null;
  status: CartStatus;
}

export interface CartItem extends Timestamped {
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
}

export interface Order extends Timestamped {
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
  delivery_method: DeliveryMethod | null;
  payment_method: PaymentMethod | null;
  contact_name: string | null;
  contact_phone: string | null;
  manager_notes: string | null;
}

export interface OrderItem extends Timestamped {
  order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Promotion extends Timestamped {
  name: string;
  description: string | null;
  promotion_type: PromotionType;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface Discount extends Timestamped {
  promotion_id: string;
  category_id: string | null;
  product_id: string | null;
  scope: DiscountScope;
  amount_type: AmountType;
  value: string;
}

export interface Coupon extends Timestamped {
  promotion_id: string | null;
  code: string;
  amount_type: AmountType;
  discount_value: string;
  min_order_amount: string | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

// --- Content ---
export interface Banner extends Timestamped {
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface News extends Timestamped {
  author_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
}

export interface StaticPage extends Timestamped {
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
}

export interface SiteSetting extends Timestamped {
  key: string;
  value: Record<string, unknown> | null;
  description: string | null;
}

// --- System ---
export interface AuditLog extends Timestamped {
  actor_type: ActorType | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
}

export interface PriceHistory extends Timestamped {
  product_id: string;
  changed_by_id: string | null;
  old_price: string;
  new_price: string;
  reason: string | null;
}

export interface UploadedFile extends Timestamped {
  uploaded_by_id: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  entity_type: string | null;
  entity_id: string | null;
}
