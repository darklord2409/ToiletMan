import uuid

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_log
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.core.telegram import verify_init_data
from app.exceptions.base import BadRequestError, UnauthorizedError
from app.models.enums import ActorType
from app.models.users.customer import Customer
from app.repositories.users.customer import CustomerRepository
from app.schemas.auth import TokenResponse
from app.services.token_issuer import TokenIssuer


class CustomerAuthService:
    """Customer-facing authentication for the storefront, Telegram Bot,
    and Telegram Mini App: email+password login/registration, Telegram
    initData login (auto-registers/binds on first contact), and
    phone+password login — architecture-ready but rejected while
    settings.PHONE_LOGIN_ENABLED is False, matching the "ready even if
    disabled" requirement without leaving a dead code path."""

    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self.session = session
        self.redis = redis
        self.repository = CustomerRepository(session)
        self.tokens = TokenIssuer(redis, actor="customer")

    async def _get_by_email(self, email: str) -> Customer | None:
        from sqlalchemy import func

        result = await self.session.execute(
            self.repository._base_query().where(func.lower(Customer.email) == email.lower())  # noqa: SLF001
        )
        return result.scalar_one_or_none()

    async def _get_by_phone(self, phone: str) -> Customer | None:
        result = await self.session.execute(
            self.repository._base_query().where(Customer.phone == phone)  # noqa: SLF001
        )
        return result.scalar_one_or_none()

    async def _get_by_telegram_id(self, telegram_id: int) -> Customer | None:
        result = await self.session.execute(
            self.repository._base_query().where(Customer.telegram_id == telegram_id)  # noqa: SLF001
        )
        return result.scalar_one_or_none()

    async def register(
        self,
        email: str,
        password: str,
        first_name: str | None,
        last_name: str | None,
        ip_address: str | None = None,
    ) -> TokenResponse:
        if await self._get_by_email(email) is not None:
            raise BadRequestError(key="errors.conflict")

        customer = await self.repository.create(
            {
                "email": email,
                "hashed_password": hash_password(password),
                "first_name": first_name,
                "last_name": last_name,
                "is_active": True,
            }
        )
        await record_audit_log(
            self.session,
            actor_type=ActorType.CUSTOMER,
            actor_id=customer.id,
            action="register",
            entity_type="customer",
            entity_id=customer.id,
            ip_address=ip_address,
        )
        return await self.tokens.issue(str(customer.id))

    async def login_with_email(
        self, email: str, password: str, ip_address: str | None = None
    ) -> TokenResponse:
        customer = await self._get_by_email(email)
        if (
            customer is None
            or not customer.is_active
            or not customer.hashed_password
            or not verify_password(password, customer.hashed_password)
        ):
            await record_audit_log(
                self.session,
                actor_type=ActorType.CUSTOMER,
                actor_id=customer.id if customer else None,
                action="login_failed",
                entity_type="customer",
                entity_id=customer.id if customer else None,
                ip_address=ip_address,
            )
            raise UnauthorizedError(key="errors.incorrect_credentials")

        await record_audit_log(
            self.session,
            actor_type=ActorType.CUSTOMER,
            actor_id=customer.id,
            action="login",
            entity_type="customer",
            entity_id=customer.id,
            ip_address=ip_address,
        )
        return await self.tokens.issue(str(customer.id))

    async def login_with_phone(
        self, phone: str, password: str, ip_address: str | None = None
    ) -> TokenResponse:
        if not settings.PHONE_LOGIN_ENABLED:
            raise BadRequestError(key="errors.phone_login_disabled")

        customer = await self._get_by_phone(phone)
        if (
            customer is None
            or not customer.is_active
            or not customer.hashed_password
            or not verify_password(password, customer.hashed_password)
        ):
            raise UnauthorizedError(key="errors.incorrect_credentials")

        await record_audit_log(
            self.session,
            actor_type=ActorType.CUSTOMER,
            actor_id=customer.id,
            action="login",
            entity_type="customer",
            entity_id=customer.id,
            ip_address=ip_address,
        )
        return await self.tokens.issue(str(customer.id))

    async def login_with_telegram(
        self, init_data: str, ip_address: str | None = None
    ) -> TokenResponse:
        payload = verify_init_data(init_data, settings.BOT_TOKEN)
        tg_user = payload.get("user")
        if not isinstance(tg_user, dict) or "id" not in tg_user:
            raise UnauthorizedError(key="errors.telegram_init_data_invalid")

        telegram_id = int(tg_user["id"])
        telegram_username = tg_user.get("username")
        customer = await self._get_by_telegram_id(telegram_id)
        if customer is None:
            customer = await self.repository.create(
                {
                    "telegram_id": telegram_id,
                    "telegram_username": telegram_username,
                    "first_name": tg_user.get("first_name"),
                    "last_name": tg_user.get("last_name"),
                    "is_active": True,
                }
            )
            action = "register_telegram"
        elif not customer.is_active:
            raise UnauthorizedError(key="errors.user_not_found_or_inactive")
        else:
            action = "login"
            # Telegram usernames can change (or be added/removed) after the
            # customer's first login — keep it current on every subsequent
            # login rather than only ever capturing it once at registration.
            if customer.telegram_username != telegram_username:
                customer = await self.repository.update(
                    customer, {"telegram_username": telegram_username}
                )

        await record_audit_log(
            self.session,
            actor_type=ActorType.CUSTOMER,
            actor_id=customer.id,
            action=action,
            entity_type="customer",
            entity_id=customer.id,
            ip_address=ip_address,
        )
        return await self.tokens.issue(str(customer.id))

    async def refresh(self, refresh_token: str) -> TokenResponse:
        subject, tokens = await self.tokens.rotate(refresh_token)
        customer = await self.repository.get(uuid.UUID(subject))
        if customer is None or not customer.is_active:
            raise UnauthorizedError(key="errors.user_not_found_or_inactive")
        return tokens

    async def logout(
        self, refresh_token: str | None, actor_id: uuid.UUID | None, ip_address: str | None = None
    ) -> None:
        await self.tokens.revoke(refresh_token)
        if actor_id:
            await record_audit_log(
                self.session,
                actor_type=ActorType.CUSTOMER,
                actor_id=actor_id,
                action="logout",
                entity_type="customer",
                entity_id=actor_id,
                ip_address=ip_address,
            )
