from fastapi import APIRouter

from app.api.v1.system import audit_log, dashboard, price_history, uploaded_file

router = APIRouter()
for module in (audit_log, dashboard, price_history, uploaded_file):
    router.include_router(module.router)
