from collections.abc import Awaitable, Callable
from typing import Any
from urllib.parse import parse_qsl

from app.core.i18n import resolve_locale, set_locale

Scope = dict[str, Any]
Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]
ASGIApp = Callable[[Scope, Receive, Send], Awaitable[None]]


class LocaleMiddleware:
    """Resolves the active locale for this request from an explicit
    `?lang=` query param (highest priority, easiest for API clients to
    control) or the `Accept-Language` header, defaulting to Russian.

    Plain ASGI middleware, not BaseHTTPMiddleware — see the comment on
    RequestLoggingMiddleware for why."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        accept_language = headers.get(b"accept-language", b"").decode("latin-1")
        query_params = dict(parse_qsl((scope.get("query_string") or b"").decode("latin-1")))

        locale = query_params.get("lang") or resolve_locale(accept_language)
        set_locale(locale)

        async def send_wrapper(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                headers_list = list(message.get("headers", []))
                headers_list.append((b"content-language", locale.encode()))
                message["headers"] = headers_list
            await send(message)

        await self.app(scope, receive, send_wrapper)
