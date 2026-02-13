import json

from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery
from redis.asyncio import Redis

from config import settings
from templates import Msg, Kb

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
                        Msg.login_success(), parse_mode="HTML"
                    )
                else:
                    await message.answer(
                        Msg.login_used(), parse_mode="HTML"
                    )
            else:
                await message.answer(
                    Msg.login_expired(), parse_mode="HTML"
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

    await message.answer(
        Msg.welcome(name),
        reply_markup=Kb.start(webapp_url, web_url),
        parse_mode="HTML",
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(
        Msg.how_it_works(),
        reply_markup=Kb.how_it_works(settings.WEBAPP_URL),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "how_it_works")
async def cb_how_it_works(callback: CallbackQuery):
    await callback.message.answer(
        Msg.how_it_works(),
        reply_markup=Kb.how_it_works(settings.WEBAPP_URL),
        parse_mode="HTML",
    )
    await callback.answer()
