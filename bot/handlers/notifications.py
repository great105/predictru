from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from config import settings

router = Router()


@router.callback_query(F.data.startswith("open_market:"))
async def open_market(callback: CallbackQuery):
    market_id = callback.data.split(":")[1]
    webapp_url = f"{settings.WEBAPP_URL}/market/{market_id}"

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Open Market",
                    web_app=WebAppInfo(url=webapp_url),
                )
            ]
        ]
    )

    await callback.message.answer(
        "Tap to open the market:",
        reply_markup=keyboard,
    )
    await callback.answer()


@router.callback_query(F.data == "dismiss")
async def dismiss(callback: CallbackQuery):
    await callback.answer()
    await callback.message.delete()
