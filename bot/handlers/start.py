import json

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)
from redis.asyncio import Redis

from config import settings

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    args = message.text.split(maxsplit=1)

    # ── Bot-based web login deep link ──
    if len(args) > 1 and args[1].startswith("login_"):
        login_token = args[1][6:]
        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        try:
            key = f"web_login:{login_token}"
            raw = await redis.get(key)
            if raw:
                data = json.loads(raw)
                if data["status"] == "pending":
                    user = message.from_user
                    user_data = {
                        "id": user.id,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "username": user.username,
                    }
                    await redis.set(
                        key,
                        json.dumps({"status": "confirmed", "user": user_data}),
                        ex=300,
                    )
                    await message.answer(
                        "\u2705 <b>Авторизация прошла успешно!</b>\n\n"
                        "Вернитесь на вкладку браузера \u2014 "
                        "вход произойдёт автоматически.",
                        parse_mode="HTML",
                    )
                else:
                    await message.answer(
                        "\u26a0\ufe0f Этот токен уже использован.",
                        parse_mode="HTML",
                    )
            else:
                await message.answer(
                    "\u274c Токен истёк. Обновите страницу сайта и попробуйте снова.",
                    parse_mode="HTML",
                )
        finally:
            await redis.aclose()
        return

    # Deep link referral
    referral_param = ""
    if len(args) > 1 and args[1].startswith("ref_"):
        referral_code = args[1][4:]
        referral_param = f"?ref={referral_code}"

    webapp_url = f"{settings.WEBAPP_URL}{referral_param}"
    web_url = f"{settings.APP_URL}/web/"

    name = message.from_user.first_name or "друг"

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="\U0001f680 Открыть приложение",
                    web_app=WebAppInfo(url=webapp_url),
                )
            ],
            [
                InlineKeyboardButton(
                    text="\U0001f310 Веб-версия",
                    url=web_url,
                )
            ],
            [
                InlineKeyboardButton(
                    text="\U0001f4b0 Мой баланс",
                    callback_data="quick_balance",
                ),
                InlineKeyboardButton(
                    text="\U0001f3c6 Топ трейдеров",
                    callback_data="quick_top",
                ),
            ],
        ]
    )

    await message.answer(
        f"Привет, <b>{name}</b>! \U0001f44b\n\n"
        "\U0001f4ca <b>ПредскажиРу</b> — рынок предсказаний нового поколения\n\n"
        "Здесь ты можешь:\n"
        "  \u2022 Торговать прогнозами на реальные события\n"
        "  \u2022 Зарабатывать PRC-токены на точных предсказаниях\n"
        "  \u2022 Соревноваться с другими трейдерами\n\n"
        "\U0001f3af <b>Политика \u2022 Спорт \u2022 Крипто \u2022 Экономика</b>\n\n"
        "\U0001f447 Нажми кнопку ниже, чтобы начать:",
        reply_markup=keyboard,
        parse_mode="HTML",
    )
