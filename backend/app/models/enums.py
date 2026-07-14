import enum


class AttributeDataType(str, enum.Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    REFERENCE = "reference"


class ProductStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ProductDocumentType(str, enum.Enum):
    MANUAL = "manual"
    CERTIFICATE = "certificate"
    WARRANTY_CARD = "warranty_card"
    INSTALLATION_INSTRUCTIONS = "installation_instructions"
    EXPLODED_DIAGRAM = "exploded_diagram"


class ProductVideoType(str, enum.Enum):
    YOUTUBE = "youtube"
    MP4 = "mp4"
    EXTERNAL = "external"


class CartStatus(str, enum.Enum):
    ACTIVE = "active"
    CONVERTED = "converted"
    ABANDONED = "abandoned"


class DeliveryMethod(str, enum.Enum):
    PICKUP = "pickup"
    DELIVERY = "delivery"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PromotionType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    BUY_X_GET_Y = "buy_x_get_y"


class DiscountScope(str, enum.Enum):
    PRODUCT = "product"
    CATEGORY = "category"
    CART = "cart"
    SHIPPING = "shipping"


class AmountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"


class ActorType(str, enum.Enum):
    CUSTOMER = "customer"
    ADMIN_USER = "admin_user"
    SYSTEM = "system"


class RecommendationType(str, enum.Enum):
    RELATED = "related"
    ACCESSORY = "accessory"
    FREQUENTLY_BOUGHT_TOGETHER = "frequently_bought_together"


class AnalyticsEventType(str, enum.Enum):
    VIEW = "view"
    ADD_TO_CART = "add_to_cart"
