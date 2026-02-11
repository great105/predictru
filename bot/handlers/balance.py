import httpx
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from config import settings

router = Router()


@router.message(Command("balance"))
async def cmd_balance(message: Message):
    try:
        async with httpx.AsyncClient(base_url=f"{settings.APP_URL}") as client:
            r = await client.get(
                "/v1/users/me",
                headers={"X-Telegram-Id": str(message.from_user.id)},
            )
            if r.status_code == 200:
                data = r.json()
                await message.answer(
                    f"Your balance: {data['balance']} PRC\n"
                    f"Total trades: {data['total_trades']}\n"
                    f"Win rate: {data['win_rate']}%"
                )
            else:
                await message.answer("Please open the app first to create your account.")
    except Exception:
        await message.answer("Service temporarily unavailable. Please try again later.")
