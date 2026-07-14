import uuid

from sqlalchemy import select

from app.models.catalog.product_image import ProductImage
from app.repositories.base import BaseRepository


class ProductImageRepository(BaseRepository[ProductImage]):
    model = ProductImage

    async def get_primary_image_map(
        self, product_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, ProductImage]:
        """Batch-fetches one thumbnail per product (preferring the image
        flagged `is_primary`, else the lowest `sort_order`) in a single
        query — used to render storefront product list pages without an
        N+1 query per row."""
        if not product_ids:
            return {}
        result = await self.session.execute(
            select(ProductImage)
            .where(
                ProductImage.product_id.in_(product_ids),
                ProductImage.deleted_at.is_(None),
            )
            .order_by(
                ProductImage.product_id,
                ProductImage.is_primary.desc(),
                ProductImage.sort_order,
            )
        )
        images_by_product: dict[uuid.UUID, ProductImage] = {}
        for image in result.scalars():
            images_by_product.setdefault(image.product_id, image)
        return images_by_product
