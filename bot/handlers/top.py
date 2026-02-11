import httpx
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from config import settings

router = Router()


@router.message(Command("top"))
async def cmd_top(message: Message):
    try:
        async with httpx.AsyncClient(base_url=f"{settings.APP_URL}") as client:
            r = await client.get("/v1/users/leaderboard", params={"period": "week"})
            if r.status_code == 200:
                entries = r.json()[:10]
                if not entries:
                    await message.answer("No leaderboard data yet.")
                    return

                lines = ["Top 10 traders this week:\n"]
                for i, entry in enumerate(entries, 1):
                    medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, f"{i}.")
                    profit_sign = "+" if entry["total_profit"] >= 0 else ""
                    lines.append(
                        f"{medal} {entry['first_name']} — "
                        f"{profit_sign}{entry['total_profit']:.2f} PRC"
                    )

                await message.answer("\n".join(lines))
            else:
                await message.answer("Could not fetch leaderboard. Please try again later.")
    except Exception:
        await message.answer("Service temporarily unavailable.")
