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
from handlers import start, balance, notifications
from templates.emoji import E

logging.basicConfig(level=logging.DEBUG if settings.APP_DEBUG else logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
dp = Dispatcher()

dp.include_routers(
    start.router,
    balance.router,
    notifications.router,
)


async def on_startup(app: web.Application):
    webhook_url = f"{settings.APP_URL}/webhook/bot"
    await bot.set_webhook(webhook_url)
    logger.info(f"Webhook set to {webhook_url}")

    await bot.set_my_commands(
        [
            BotCommand(command="start", description=f"{E.CRYSTAL} Начать"),
            BotCommand(command="balance", description=f"{E.COIN} Мой счёт"),
            BotCommand(command="help", description=f"{E.THINKING} Как играть"),
        ]
    )

    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text=f"{E.CRYSTAL} ПредскажиРу",
                web_app=WebAppInfo(url=settings.WEBAPP_URL),
            )
        )
    except Exception as e:
        logger.warning(f"Could not set menu button: {e}")

    try:
        await bot.set_my_description(
            description=(
                "Угадывай события {DASH} зарабатывай монеты!\n\n"
                "ПредскажиРу {DASH} это игра в прогнозы. "
                "Выбирай вопрос о политике, спорте или "
                "экономике, ставь на ДА или НЕТ.\n\n"
                "Угадал {DASH} забираешь монеты!\n\n"
                "{GIFT} 1 000 монет на старте {DASH} бесплатно"
            )
            .replace("{DASH}", E.DASH)
            .replace("{GIFT}", E.GIFT)
        )
        await bot.set_my_short_description(
            short_description=(
                f"{E.CRYSTAL} Угадывай события {E.DASH} зарабатывай монеты!"
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
