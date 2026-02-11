from aiogram import Router, F
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from config import settings

router = Router()


@router.callback_query(F.data.startswith("open_market:"))
async def open_market(callback: CallbackQuery):
    market_id = callback.data.split(":")[1]

    if market_id == "home":
        webapp_url = settings.WEBAPP_URL
        text = "\U0001f4ca Открой приложение и выбери рынок:"
    else:
        webapp_url = f"{settings.WEBAPP_URL}/market/{market_id}"
        text = "\U0001f4c8 Нажми, чтобы открыть рынок:"

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="\U0001f680 Открыть",
                    web_app=WebAppInfo(url=webapp_url),
                )
            ]
        ]
    )

    await callback.message.answer(text, reply_markup=keyboard)
    await callback.answer()


@router.callback_query(F.data == "dismiss")
async def dismiss(callback: CallbackQuery):
    await callback.answer()
    try:
        await callback.message.delete()
    except Exception:
        pass
