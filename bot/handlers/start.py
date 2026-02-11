from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from config import settings

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    # Deep link referral
    args = message.text.split(maxsplit=1)
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
