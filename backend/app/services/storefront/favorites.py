import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.base import BadRequestError
from app.models.enums import ProductStatus
from app.repositories.catalog.product import ProductRepository
from app.repositories.catalog.product_image import ProductImageRepository
from app.repositories.users.favorite import FavoriteRepository
from app.schemas.storefront.favorites import FavoriteResponse
from app.services.commerce.discount_engine import DiscountEngine
from app.services.storefront._shared import build_product_summary


class StorefrontFavoritesService:
    def __init__(self, session: AsyncSession) -> None:
        self.favorite_repo = FavoriteRepository(session)
        self.product_repo = ProductRepository(session)
        self.image_repo = ProductImageRepository(session)
        self.discount_engine = DiscountEngine(session)

    async def list_favorites(self, customer_id: uuid.UUID) -> list[FavoriteResponse]:
        favorites, _ = await self.favorite_repo.list_all(
            filters={"customer_id": customer_id}, limit=500, sort_by="created_at", sort_order="desc"
        )
        responses = []
        for favorite in favorites:
            product = await self.product_repo.get(favorite.product_id)
            if product is None:
                continue
            responses.append(
                FavoriteResponse(
                    id=favorite.id,
                    product=await build_product_summary(
                        self.image_repo, product, self.discount_engine
                    ),
                    created_at=favorite.created_at,
                )
            )
        return responses

    async def add_favorite(self, customer_id: uuid.UUID, product_id: uuid.UUID) -> FavoriteResponse:
        product = await self.product_repo.get(product_id)
        if product is None or product.status != ProductStatus.ACTIVE:
            raise BadRequestError(key="errors.product_not_available")

        existing = await self.favorite_repo.get_by_customer_and_product(customer_id, product_id)
        favorite = existing or await self.favorite_repo.create(
            {"customer_id": customer_id, "product_id": product_id}
        )
        return FavoriteResponse(
            id=favorite.id,
            product=await build_product_summary(self.image_repo, product, self.discount_engine),
            created_at=favorite.created_at,
        )

    async def remove_favorite(self, customer_id: uuid.UUID, product_id: uuid.UUID) -> None:
        existing = await self.favorite_repo.get_by_customer_and_product(customer_id, product_id)
        if existing is not None:
            await self.favorite_repo.soft_delete(existing)
