"""Seed roles and permissions. Idempotent — safe to run multiple times.

    docker compose exec backend python -m scripts.seed_rbac
"""

import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.users.permission import Permission
from app.models.users.role import Role
from app.models.users.role_permission import RolePermission

RESOURCES = [
    "manufacturers",
    "units",
    "categories",
    "products",
    "product-images",
    "attribute-definitions",
    "product-attributes",
    "customers",
    "admin-users",
    "roles",
    "permissions",
    "role-permissions",
    "carts",
    "cart-items",
    "orders",
    "order-items",
    "promotions",
    "discounts",
    "coupons",
    "banners",
    "news",
    "static-pages",
    "site-settings",
    "audit-logs",
    "price-history",
    "uploaded-files",
    "settings",
    "attribute-groups",
    "reference-values",
    "product-types",
    "collections",
    "product-labels",
    "attribute-sets",
    "attribute-set-items",
    "product-label-assignments",
    "product-documents",
    "product-videos",
]
ACTIONS = ["read", "create", "update", "delete"]
EXTRA_PERMISSIONS = ["reports.read", "prices.update"]

RBAC_RESTRICTED_RESOURCES = {"roles", "permissions", "role-permissions"}

ROLES: dict[str, str | None] = {
    "super_admin": "Full unrestricted access to every resource and RBAC configuration.",
    "administrator": "Full operational access; cannot manage roles/permissions.",
    "manager": "Broad day-to-day store operations across catalog, orders, and content.",
    "sales_manager": "Order and customer facing operations.",
    "warehouse": "Stock, pricing, and fulfillment visibility.",
    "content_manager": "Storefront content: banners, news, pages, site settings.",
}


def _all_codes() -> list[str]:
    codes = [f"{resource}.{action}" for resource in RESOURCES for action in ACTIONS]
    return codes + EXTRA_PERMISSIONS


def _grants_for(role: str) -> set[str]:
    if role == "super_admin":
        return set(_all_codes())

    if role == "administrator":
        return {
            f"{resource}.{action}"
            for resource in RESOURCES
            for action in ACTIONS
            if resource not in RBAC_RESTRICTED_RESOURCES
        } | set(EXTRA_PERMISSIONS)

    if role == "manager":
        full_crud = [
            "manufacturers",
            "units",
            "categories",
            "products",
            "product-images",
            "attribute-definitions",
            "product-attributes",
            "promotions",
            "discounts",
            "coupons",
            "banners",
            "news",
            "static-pages",
            "attribute-groups",
            "reference-values",
            "product-types",
            "collections",
            "product-labels",
            "attribute-sets",
            "attribute-set-items",
            "product-label-assignments",
            "product-documents",
            "product-videos",
        ]
        codes = {f"{r}.{a}" for r in full_crud for a in ACTIONS}
        codes |= {"orders.read", "orders.update", "order-items.read", "customers.read"}
        codes |= {"carts.read", "cart-items.read", "site-settings.read", "settings.read"}
        codes |= {"reports.read", "prices.update"}
        return codes

    if role == "sales_manager":
        return {
            "orders.read",
            "orders.update",
            "order-items.read",
            "customers.read",
            "products.read",
            "categories.read",
            "carts.read",
            "cart-items.read",
            "coupons.read",
            "promotions.read",
            "discounts.read",
            "reports.read",
        }

    if role == "warehouse":
        return {
            "products.read",
            "products.update",
            "product-images.read",
            "product-attributes.read",
            "attribute-definitions.read",
            "units.read",
            "units.update",
            "manufacturers.read",
            "price-history.read",
            "orders.read",
            "order-items.read",
            "prices.update",
            "attribute-groups.read",
            "reference-values.read",
            "product-types.read",
            "attribute-sets.read",
            "attribute-set-items.read",
            "product-documents.read",
        }

    if role == "content_manager":
        content_resources = (
            "banners",
            "news",
            "static-pages",
            "uploaded-files",
            "product-labels",
            "product-label-assignments",
            "collections",
            "product-documents",
            "product-videos",
        )
        codes = {f"{r}.{a}" for r in content_resources for a in ACTIONS}
        codes |= {"categories.read", "categories.update", "products.read"}
        codes |= {"site-settings.read", "site-settings.update", "site-settings.create"}
        return codes

    return set()


async def main() -> None:
    async with AsyncSessionLocal() as session:
        existing_permissions = {
            p.code: p for p in (await session.execute(select(Permission))).scalars().all()
        }
        for code in _all_codes():
            if code not in existing_permissions:
                perm = Permission(code=code)
                session.add(perm)
                existing_permissions[code] = perm
        await session.flush()

        existing_roles = {r.name: r for r in (await session.execute(select(Role))).scalars().all()}
        for name, description in ROLES.items():
            if name not in existing_roles:
                role = Role(name=name, description=description)
                session.add(role)
                existing_roles[name] = role
        await session.flush()

        existing_grants = {
            (rp.role_id, rp.permission_id)
            for rp in (await session.execute(select(RolePermission))).scalars().all()
        }
        created_grants = 0
        for role_name, role in existing_roles.items():
            for code in _grants_for(role_name):
                permission = existing_permissions.get(code)
                if permission is None:
                    continue
                key = (role.id, permission.id)
                if key not in existing_grants:
                    session.add(RolePermission(role_id=role.id, permission_id=permission.id))
                    existing_grants.add(key)
                    created_grants += 1

        await session.commit()
        print(
            f"Seeded {len(existing_permissions)} permissions, {len(existing_roles)} roles, "
            f"{created_grants} new role-permission grants."
        )


if __name__ == "__main__":
    asyncio.run(main())
