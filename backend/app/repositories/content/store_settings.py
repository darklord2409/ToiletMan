from app.models.content.store_settings import StoreSettings
from app.repositories.base import BaseRepository


class StoreSettingsRepository(BaseRepository[StoreSettings]):
    model = StoreSettings

    async def get_singleton(self) -> StoreSettings | None:
        result = await self.session.execute(self._base_query().limit(1))
        return result.scalar_one_or_none()
