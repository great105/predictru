from aiogram import Router, F
from aiogram.types import CallbackQuery

from config import settings
from templates import Msg, Kb

router = Router()


@router.callback_query(F.data.startswith("open_market:"))
async def open_market(callback: CallbackQuery):
    market_id = callback.data.split(":")[1]

    if market_id == "home":
        webapp_url = settings.WEBAPP_URL
        text = Msg.open_app_prompt()
    else:
        webapp_url = f"{settings.WEBAPP_URL}/market/{market_id}"
        text = Msg.open_market_prompt()

    await callback.message.answer(
        text, reply_markup=Kb.open_market(webapp_url)
    )
    await callback.answer()


@router.callback_query(F.data == "dismiss")
async def dismiss(callback: CallbackQuery):
    await callback.answer()
    try:
        await callback.message.delete()
    except Exception:
        pass
