import httpx
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery

from config import settings
from templates import Msg, Kb

router = Router()


async def _fetch_balance(telegram_id: int) -> str:
    """Fetch user balance and format a message."""
    try:
        async with httpx.AsyncClient(base_url=settings.APP_URL) as client:
            r = await client.get(
                "/v1/users/me",
                headers={"X-Telegram-Id": str(telegram_id)},
            )
            if r.status_code == 200:
                data = r.json()
                return Msg.profile(
                    balance=float(data["balance"]),
                    trades=data.get("total_trades", 0),
                    win_rate=data.get("win_rate", 0),
                )
            else:
                return Msg.not_found()
    except Exception:
        return Msg.unavailable()


@router.message(Command("balance"))
async def cmd_balance(message: Message):
    text = await _fetch_balance(message.from_user.id)
    await message.answer(
        text,
        reply_markup=Kb.balance(settings.WEBAPP_URL),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "quick_balance")
async def cb_balance(callback: CallbackQuery):
    text = await _fetch_balance(callback.from_user.id)
    await callback.message.answer(
        text,
        reply_markup=Kb.balance(settings.WEBAPP_URL),
        parse_mode="HTML",
    )
    await callback.answer()
