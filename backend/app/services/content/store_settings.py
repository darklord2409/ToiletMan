from app.models.content.store_settings import StoreSettings
from app.repositories.content.store_settings import StoreSettingsRepository
from app.schemas.content.store_settings import StoreSettingsUpdate
from app.services.telegram_notifier import TelegramNotifier


class StoreSettingsService:
    """Singleton settings: always operates on the one existing row (lazily
    created with sane defaults on first access) instead of requiring
    callers to know a row id."""

    def __init__(
        self, repository: StoreSettingsRepository, notifier: TelegramNotifier | None = None
    ) -> None:
        self.repository = repository
        self.notifier = notifier or TelegramNotifier()

    async def get_or_create(self) -> StoreSettings:
        existing = await self.repository.get_singleton()
        if existing is not None:
            return existing
        return await self.repository.create({"store_name": "My Store"})

    async def update(self, payload: StoreSettingsUpdate) -> StoreSettings:
        obj = await self.get_or_create()
        data = payload.model_dump(exclude_unset=True)
        new_name = data.get("bot_name")
        # The admin form always resubmits every field on the page (not just
        # the one the user actually edited), so `"bot_name" in data` is true
        # on nearly every save of this page — comparing against the value
        # already on the row (captured before the update below overwrites
        # it) is what actually distinguishes "the name changed" from "the
        # name was merely present in the payload again."
        name_changed = "bot_name" in data and new_name != obj.bot_name
        obj = await self.repository.update(obj, data)

        # bot_name maps to a real Telegram Bot API call (setMyName) — unlike
        # every other field here, it isn't just passively read by the bot on
        # its next interaction, so an actual change must actively push it.
        # This method is also strictly rate-limited by Telegram (confirmed:
        # a burst of calls got a 429 with retry_after in the tens of
        # thousands of seconds) — so this must fire only on real changes,
        # never on every save of the page.
        # bot_username can NEVER be pushed this way (Telegram only allows a
        # bot to change its own @username via BotFather's /setusername) —
        # best-effort refresh it here from the real getMe() result instead,
        # since we're already talking to Telegram, so the admin form always
        # shows the true current value rather than a stale manually-typed one.
        if name_changed and new_name:
            await self.notifier.set_my_name(new_name)
            me = await self.notifier.get_me()
            real_username = me.get("username") if me else None
            if real_username and real_username != obj.bot_username:
                obj = await self.repository.update(obj, {"bot_username": real_username})

        return obj
