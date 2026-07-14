from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.core.i18n import translate

# Every CRUD entity router uses tags=["<resource-slug>"] where the slug
# matches a "resource.<slug>" catalog entry (same slugs RBAC permissions
# and seed_rbac.py use) — so a tag can be recognized as an "entity tag"
# just by checking whether that catalog entry exists, no separate list
# to keep in sync.
_DOMAIN_TAGS = {"auth", "customer-auth", "settings", "i18n", "health", "dashboard"}

_EXPLICIT_SUMMARY_KEYS: dict[tuple[str, str], str] = {
    ("/auth/login", "post"): "swagger.auth.login",
    ("/auth/refresh", "post"): "swagger.auth.refresh",
    ("/auth/logout", "post"): "swagger.auth.logout",
    ("/auth/me", "get"): "swagger.auth.me",
    ("/auth/me/language", "patch"): "swagger.auth.update_language",
    ("/auth/change-password", "post"): "swagger.auth.change_password",
    ("/auth/password-reset/request", "post"): "swagger.auth.password_reset_request",
    ("/auth/password-reset/confirm", "post"): "swagger.auth.password_reset_confirm",
    ("/customer-auth/register", "post"): "swagger.customer_auth.register",
    ("/customer-auth/login", "post"): "swagger.customer_auth.login",
    ("/customer-auth/login/phone", "post"): "swagger.customer_auth.login_phone",
    ("/customer-auth/telegram", "post"): "swagger.customer_auth.telegram",
    ("/customer-auth/refresh", "post"): "swagger.customer_auth.refresh",
    ("/customer-auth/logout", "post"): "swagger.customer_auth.logout",
    ("/customer-auth/me", "get"): "swagger.customer_auth.me",
    ("/customer-auth/me/language", "patch"): "swagger.customer_auth.update_language",
    ("/settings/public", "get"): "swagger.settings.public",
    ("/settings", "get"): "swagger.settings.get",
    ("/settings", "patch"): "swagger.settings.update",
    ("/i18n/messages", "get"): "swagger.i18n.messages",
    ("/health", "get"): "swagger.health.service",
    ("/health/db", "get"): "swagger.health.database",
    ("/health/redis", "get"): "swagger.health.redis",
    ("/products/filters", "get"): "swagger.products.filters",
    ("/products/apply-scheduled-prices", "post"): "swagger.products.apply_scheduled_prices",
    ("/products/bulk/status", "post"): "swagger.products.bulk_status",
    ("/products/bulk/manufacturer", "post"): "swagger.products.bulk_manufacturer",
    ("/products/bulk/category", "post"): "swagger.products.bulk_category",
    ("/products/bulk/collection", "post"): "swagger.products.bulk_collection",
    ("/products/bulk/update", "post"): "swagger.products.bulk_update",
    ("/products/bulk/delete", "post"): "swagger.products.bulk_delete",
    ("/products/bulk/price-adjust", "post"): "swagger.products.bulk_price_adjust",
    ("/products/{item_id}/archive", "post"): "swagger.products.archive",
    ("/products/{item_id}/restore", "post"): "swagger.products.restore",
    ("/products/{item_id}/clone", "post"): "swagger.products.clone",
    ("/products/{item_id}/price-rollback", "post"): "swagger.products.price_rollback",
    ("/products/import/preview", "post"): "swagger.products.import_preview",
    ("/products/import/commit", "post"): "swagger.products.import_commit",
    ("/products/export", "get"): "swagger.products.export",
    ("/admin-users/{item_id}/sessions", "get"): "swagger.admin_users.sessions_list",
    ("/admin-users/{item_id}/sessions", "delete"): "swagger.admin_users.sessions_revoke_all",
    ("/admin-users/{item_id}/sessions/{jti}", "delete"): "swagger.admin_users.sessions_revoke",
    ("/uploaded-files/upload", "post"): "swagger.uploaded_files.upload",
}

# Query-param display name -> translation key. Keyed by name only: every
# occurrence of e.g. "product_id" across different entities' filter
# functions means the same thing ("Filter by product id"), so one key
# covers all of them.
_QUERY_PARAM_KEYS: dict[str, str] = {
    "category_id": "swagger.filters.category_id",
    "manufacturer_id": "swagger.filters.manufacturer_id",
    "is_active": "swagger.filters.is_active",
    "parent_id": "swagger.filters.parent_id",
    "product_id": "swagger.filters.product_id",
    "customer_id": "swagger.filters.customer_id",
    "cart_id": "swagger.filters.cart_id",
    "promotion_id": "swagger.filters.promotion_id",
    "order_id": "swagger.filters.order_id",
    "role_id": "swagger.filters.role_id",
    "permission_id": "swagger.filters.permission_id",
    "entity_type": "swagger.filters.entity_type",
    "entity_id": "swagger.filters.entity_id",
    "is_published": "swagger.filters.is_published",
    "status": "swagger.filters.order_status",
    "lang": "swagger.filters.lang",
    "reference_type": "swagger.filters.reference_type",
    "attribute_set_id": "swagger.filters.attribute_set_id",
    "attribute_definition_id": "swagger.filters.attribute_definition_id",
    "product_type_id": "swagger.filters.product_type_id",
    "collection_id": "swagger.filters.collection_id",
    "product_status": "swagger.filters.product_status",
}

_ACTION_SUMMARY_KEYS = {
    "list": "swagger.list_summary",
    "get": "swagger.get_summary",
    "create": "swagger.create_summary",
    "update": "swagger.update_summary",
    "delete": "swagger.delete_summary",
}


def _infer_crud_action(method: str, path: str) -> str | None:
    method = method.lower()
    last_segment = path.rstrip("/").rsplit("/", 1)[-1]
    ends_with_param = last_segment.startswith("{")
    if method == "get":
        return "get" if ends_with_param else "list"
    if method == "post":
        return "create" if not ends_with_param else None
    if method in ("patch", "put"):
        return "update" if ends_with_param else None
    if method == "delete":
        return "delete" if ends_with_param else None
    return None


def _resource_label(slug: str, locale: str) -> str | None:
    """Returns the translated resource label, or None if `slug` isn't a
    known resource (i.e. it's a fixed domain tag like "auth", not an
    entity CRUD tag)."""
    label = translate(f"resource.{slug}", locale)
    return None if label == f"resource.{slug}" else label


def _strip_prefix(path: str, prefix: str) -> str:
    return path[len(prefix) :] if prefix and path.startswith(prefix) else path


def translate_openapi_schema(
    schema: dict[str, Any], locale: str, api_prefix: str
) -> dict[str, Any]:
    """Mutates and returns `schema` (as produced by fastapi.openapi.utils.
    get_openapi) with every summary/description/tag translated for
    `locale`. Entity CRUD endpoints are re-derived generically from
    (method, path shape, tag) rather than from whatever English text was
    baked in at route-decoration time, so this is correct regardless of
    the server's own default locale."""
    schema["info"]["title"] = translate("swagger.api_title", locale)
    schema["info"]["description"] = translate("swagger.api_description", locale)

    tag_name_map: dict[str, str] = {}

    for path, methods in schema.get("paths", {}).items():
        short_path = _strip_prefix(path, api_prefix)
        for method, operation in methods.items():
            if method not in ("get", "post", "patch", "put", "delete"):
                continue

            tags = operation.get("tags") or []
            slug = tags[0] if tags else None

            explicit_key = _EXPLICIT_SUMMARY_KEYS.get((short_path, method))
            if explicit_key:
                operation["summary"] = translate(explicit_key, locale)
            elif slug:
                resource_label = _resource_label(slug, locale)
                action = _infer_crud_action(method, short_path)
                if resource_label and action and action in _ACTION_SUMMARY_KEYS:
                    operation["summary"] = translate(
                        _ACTION_SUMMARY_KEYS[action], locale, resource=resource_label
                    )

            if slug and slug not in tag_name_map:
                if slug in _DOMAIN_TAGS:
                    tag_name_map[slug] = translate(f"swagger.tag_name.{slug}", locale)
                else:
                    tag_name_map[slug] = _resource_label(slug, locale) or slug

            for param in operation.get("parameters") or []:
                key = _QUERY_PARAM_KEYS.get(param.get("name", ""))
                if key:
                    param["description"] = translate(key, locale)

    # Rewrite every operation's tag list to use the translated display name,
    # then rebuild the top-level tag registry (name + description) to match.
    for methods in schema.get("paths", {}).values():
        for method, operation in methods.items():
            if method not in ("get", "post", "patch", "put", "delete"):
                continue
            operation["tags"] = [tag_name_map.get(t, t) for t in operation.get("tags") or []]

    schema["tags"] = []
    for slug, display_name in tag_name_map.items():
        tag_entry = {"name": display_name}
        if slug in _DOMAIN_TAGS:
            tag_entry["description"] = translate(f"swagger.tag.{slug}", locale)
        schema["tags"].append(tag_entry)

    return schema


def build_localized_openapi(app: FastAPI, locale: str, api_prefix: str) -> dict[str, Any]:
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    return translate_openapi_schema(schema, locale, api_prefix)
