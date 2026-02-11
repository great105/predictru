import asyncio
import logging

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

from config import settings
from handlers import start, balance, top, notifications

logging.basicConfig(level=logging.DEBUG if settings.APP_DEBUG else logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
dp = Dispatcher()

dp.include_routers(
    start.router,
    balance.router,
    top.router,
    notifications.router,
)


async def on_startup(app: web.Application):
    webhook_url = f"{settings.APP_URL}/webhook/bot"
    await bot.set_webhook(webhook_url)
    logger.info(f"Webhook set to {webhook_url}")


async def on_shutdown(app: web.Application):
    await bot.delete_webhook()
    await bot.session.close()


def main():
    app = web.Application()
    app.on_startup.append(on_startup)
    app.on_shutdown.append(on_shutdown)

    handler = SimpleRequestHandler(dispatcher=dp, bot=bot)
    handler.register(app, path="/webhook/bot")
    setup_application(app, dp, bot=bot)

    web.run_app(app, host="0.0.0.0", port=8081)


if __name__ == "__main__":
    main()
