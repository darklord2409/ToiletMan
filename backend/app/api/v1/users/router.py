from fastapi import APIRouter

from app.api.v1.users import admin_user, customer, permission, role, role_permission

router = APIRouter()
for module in (customer, admin_user, role, permission, role_permission):
    router.include_router(module.router)
