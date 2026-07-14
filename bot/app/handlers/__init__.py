from aiogram import Router

from app.handlers import language, menu, start

router = Router(name="root")
router.include_router(start.router)
router.include_router(language.router)
router.include_router(menu.router)
