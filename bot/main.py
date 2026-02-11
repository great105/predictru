import logging

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.types import (
    BotCommand,
    MenuButtonWebApp,
    WebAppInfo,
)
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

    # Set bot commands menu
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="\U0001f680 Начать"),
            BotCommand(command="balance", description="\U0001f4b0 Мой баланс"),
            BotCommand(command="top", description="\U0001f3c6 Топ трейдеров"),
        ]
    )

    # Set Mini App menu button (replaces default hamburger menu)
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="\U0001f4ca ПредскажиРу",
                web_app=WebAppInfo(url=settings.WEBAPP_URL),
            )
        )
    except Exception as e:
        logger.warning(f"Could not set menu button: {e}")

    # Set bot description (shown when user opens bot for the first time)
    try:
        await bot.set_my_description(
            description=(
                "\U0001f4ca ПредскажиРу — рынок предсказаний нового поколения!\n\n"
                "Торгуй прогнозами на реальные события: "
                "политика, спорт, крипто, экономика.\n\n"
                "\U0001f3af Делай точные предсказания\n"
                "\U0001f4b0 Зарабатывай PRC-токены\n"
                "\U0001f3c6 Соревнуйся с трейдерами"
            )
        )
        await bot.set_my_short_description(
            short_description=(
                "\U0001f4ca Рынок предсказаний — торгуй прогнозами на реальные события"
            )
        )
    except Exception as e:
        logger.warning(f"Could not set bot description: {e}")

    logger.info("Bot commands, menu button, and description configured")


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
