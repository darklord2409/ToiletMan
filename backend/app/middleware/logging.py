import time
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from loguru import logger

Scope = dict[str, Any]
Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]
ASGIApp = Callable[[Scope, Receive, Send], Awaitable[None]]


class RequestLoggingMiddleware:
    """Assigns a request ID, logs one structured line per request, and
    echoes the ID back via the X-Request-ID header for client-side
    correlation with server logs.

    Deliberately plain ASGI (not starlette.middleware.base.BaseHTTPMiddleware):
    BaseHTTPMiddleware runs the downstream app in a separate anyio task via
    a task group, which can hand async DB/Redis connections a Future bound
    to a different task context than the one that opened them — a known
    source of "attached to a different loop" errors under concurrent load
    and in ASGI-transport test clients. Plain ASGI middleware runs the
    whole chain in one task, avoiding the class of bug entirely."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())
        method = scope["method"]
        path = scope["path"]
        bound_logger = logger.bind(request_id=request_id)
        start = time.perf_counter()
        status_holder: dict[str, int] = {}

        async def send_wrapper(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                message["headers"] = headers
            await send(message)

        bound_logger.info("--> {} {}", method, path)
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            bound_logger.exception("<-- {} {} failed after {:.1f}ms", method, path, duration_ms)
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        bound_logger.info(
            "<-- {} {} {} ({:.1f}ms)", method, path, status_holder.get("status"), duration_ms
        )
