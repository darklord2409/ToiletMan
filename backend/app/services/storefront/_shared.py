from typing import Any

from app.repositories.catalog.product_image import ProductImageRepository
from app.schemas.catalog.product import ProductRead
from app.schemas.storefront.catalog import ProductSummary


async def build_product_summary(image_repo: ProductImageRepository, product: Any) -> ProductSummary:
    """Shared by the cart and favorites services: a lightweight product
    projection (used identically by both) that goes through `ProductRead`
    for `availability_status`/`available_quantity` — those are
    `@computed_field`s on the Pydantic schema, not real columns on the ORM
    object, so reading them off `product` directly raises AttributeError."""
    images, _ = await image_repo.list_all(
        filters={"product_id": product.id, "is_primary": True}, limit=1
    )
    if not images:
        images, _ = await image_repo.list_all(
            filters={"product_id": product.id}, limit=1, sort_by="sort_order"
        )
    read = ProductRead.model_validate(product)
    return ProductSummary(
        id=read.id,
        sku=read.sku,
        slug=read.slug,
        name=read.name,
        price=read.price,
        compare_at_price=read.compare_at_price,
        primary_image_url=images[0].url if images else None,
        availability_status=read.availability_status,
    )
