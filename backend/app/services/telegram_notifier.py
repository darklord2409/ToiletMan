from typing import Any

import httpx
from loguru import logger

from app.core.config import settings

_TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramNotifier:
    """Sends outbound Telegram messages directly to the Bot API's HTTP
    interface — deliberately not routed through the bot process (see
    TELEGRAM.md for the full rationale): the backend already holds
    `BOT_TOKEN` and every recipient's `telegram_id`, and there is no
    background-job/queue infrastructure in this backend to build a
    poller on top of.

    Every method here swallows its own failures (bad chat_id, blocked
    bot, network hiccup, missing token) and returns whether delivery
    succeeded — a notification failing must never fail the request that
    triggered it (an order status update, a checkout, etc.)."""

    def __init__(self, bot_token: str | None = None, timeout: float = 5.0) -> None:
        self.bot_token = bot_token if bot_token is not None else settings.BOT_TOKEN
        self.timeout = timeout

    async def send_message(self, chat_id: int, text: str) -> bool:
        if not self.bot_token or not chat_id or not text:
            return False

        url = f"{_TELEGRAM_API_BASE}/bot{self.bot_token}/sendMessage"
        payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
            if response.status_code != 200:
                logger.warning(
                    "Telegram sendMessage failed chat_id={} status={} body={}",
                    chat_id,
                    response.status_code,
                    response.text[:300],
                )
                return False
            return True
        except httpx.HTTPError as exc:
            logger.warning("Telegram sendMessage errored chat_id={}: {}", chat_id, exc)
            return False

    async def set_my_name(self, name: str) -> bool:
        """Pushes the bot's displayed name (distinct from its @username,
        which Telegram never lets a bot change via API — BotFather's
        /setusername is the only way for that one)."""
        if not self.bot_token or not name:
            return False

        url = f"{_TELEGRAM_API_BASE}/bot{self.bot_token}/setMyName"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json={"name": name})
            if response.status_code != 200:
                logger.warning(
                    "Telegram setMyName failed status={} body={}",
                    response.status_code,
                    response.text[:300],
                )
                return False
            return True
        except httpx.HTTPError as exc:
            logger.warning("Telegram setMyName errored: {}", exc)
            return False

    async def get_me(self) -> dict[str, Any] | None:
        if not self.bot_token:
            return None

        url = f"{_TELEGRAM_API_BASE}/bot{self.bot_token}/getMe"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
            if response.status_code != 200:
                logger.warning(
                    "Telegram getMe failed status={} body={}",
                    response.status_code,
                    response.text[:300],
                )
                return None
            result = response.json().get("result")
            return result if isinstance(result, dict) else None
        except httpx.HTTPError as exc:
            logger.warning("Telegram getMe errored: {}", exc)
            return None
