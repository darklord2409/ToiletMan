from fastapi import APIRouter

from app.api.v1.content import banner, news, site_setting, static_page

router = APIRouter()
for module in (banner, news, static_page, site_setting):
    router.include_router(module.router)
