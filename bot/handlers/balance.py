import httpx
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from config import settings

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
                balance = float(data["balance"])
                trades = data.get("total_trades", 0)
                win_rate = data.get("win_rate", 0)

                # Trend emoji based on win rate
                if win_rate >= 60:
                    trend = "\U0001f525"  # fire
                elif win_rate >= 40:
                    trend = "\u2705"  # check
                else:
                    trend = "\U0001f4a1"  # lightbulb

                return (
                    f"\U0001f4b0 <b>Твой профиль</b>\n\n"
                    f"\U0001f4b3 Баланс: <b>{balance:,.2f} PRC</b>\n"
                    f"\U0001f4c8 Сделок: <b>{trades}</b>\n"
                    f"{trend} Винрейт: <b>{win_rate}%</b>\n\n"
                    f"\U0001f4a1 <i>Торгуй точнее — зарабатывай больше!</i>"
                )
            else:
                return (
                    "\U0001f636 Аккаунт не найден.\n\n"
                    "Открой приложение, чтобы зарегистрироваться \U0001f447"
                )
    except Exception:
        return "\u26a0\ufe0f Сервис временно недоступен. Попробуй позже."


def _balance_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="\U0001f4bc Мой портфель",
                    web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/portfolio"),
                )
            ],
            [
                InlineKeyboardButton(
                    text="\U0001f3e0 На главную",
                    web_app=WebAppInfo(url=settings.WEBAPP_URL),
                )
            ],
        ]
    )


@router.message(Command("balance"))
async def cmd_balance(message: Message):
    text = await _fetch_balance(message.from_user.id)
    await message.answer(
        text,
        reply_markup=_balance_keyboard(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "quick_balance")
async def cb_balance(callback: CallbackQuery):
    text = await _fetch_balance(callback.from_user.id)
    await callback.message.answer(
        text,
        reply_markup=_balance_keyboard(),
        parse_mode="HTML",
    )
    await callback.answer()
