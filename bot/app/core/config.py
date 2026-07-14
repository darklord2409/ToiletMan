from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    BOT_TOKEN: str = ""
    ENVIRONMENT: str = "local"
    LOG_LEVEL: str = "INFO"

    BACKEND_BASE_URL: str = "http://backend:8000/api/v1"
    # Public HTTPS URL of the Mini App — Telegram requires WebApp buttons to
    # point at an https:// origin, so this is empty/unset for pure local
    # dev (no button shown) and must be set once the Mini App is deployed
    # somewhere Telegram can reach (a tunnel in dev, a real host in prod).
    WEBAPP_URL: str = ""

    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 1
    REDIS_PASSWORD: str | None = None

    @property
    def REDIS_URL(self) -> str:
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
