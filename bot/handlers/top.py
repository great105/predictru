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

MEDALS = {1: "\U0001f947", 2: "\U0001f948", 3: "\U0001f949"}


async def _fetch_top() -> str:
    """Fetch leaderboard and format a message."""
    try:
        async with httpx.AsyncClient(base_url=settings.APP_URL) as client:
            r = await client.get("/v1/users/leaderboard", params={"period": "week"})
            if r.status_code == 200:
                entries = r.json()[:10]
                if not entries:
                    return (
                        "\U0001f3c6 <b>Рейтинг трейдеров</b>\n\n"
                        "<i>Пока нет данных. Будь первым!</i>"
                    )

                lines = ["\U0001f3c6 <b>Топ-10 трейдеров недели</b>\n"]
                for i, entry in enumerate(entries, 1):
                    medal = MEDALS.get(i, f"<b>{i}.</b>")
                    name = entry.get("first_name", "Аноним")
                    profit = float(entry.get("total_profit", 0))
                    sign = "+" if profit >= 0 else ""
                    lines.append(
                        f"  {medal} {name} — "
                        f"<code>{sign}{profit:.2f} PRC</code>"
                    )

                lines.append(
                    "\n\U0001f4aa <i>Торгуй и попади в рейтинг!</i>"
                )
                return "\n".join(lines)
            else:
                return "\u26a0\ufe0f Не удалось загрузить рейтинг. Попробуй позже."
    except Exception:
        return "\u26a0\ufe0f Сервис временно недоступен. Попробуй позже."


def _top_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="\U0001f4ca Все рынки",
                    web_app=WebAppInfo(url=settings.WEBAPP_URL),
                )
            ],
            [
                InlineKeyboardButton(
                    text="\U0001f3c6 Полный рейтинг",
                    web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/leaderboard"),
                )
            ],
        ]
    )


@router.message(Command("top"))
async def cmd_top(message: Message):
    text = await _fetch_top()
    await message.answer(
        text,
        reply_markup=_top_keyboard(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "quick_top")
async def cb_top(callback: CallbackQuery):
    text = await _fetch_top()
    await callback.message.answer(
        text,
        reply_markup=_top_keyboard(),
        parse_mode="HTML",
    )
    await callback.answer()
