from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_redis
from app.core.i18n import translate

router = APIRouter(tags=["health"])


@router.get("/health", summary=translate("swagger.health.service"))
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db", summary=translate("swagger.health.database"))
async def health_db(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}


@router.get("/health/redis", summary=translate("swagger.health.redis"))
async def health_redis(redis: Redis = Depends(get_redis)) -> dict[str, str]:
    await redis.ping()
    return {"status": "ok"}
