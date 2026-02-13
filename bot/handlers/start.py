import json
import logging

import aiohttp
from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery
from redis.asyncio import Redis

from config import settings
from templates import Msg, Kb

logger = logging.getLogger(__name__)

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    args = message.text.split(maxsplit=1)

    # ── Private bet deep link: bet_XXXXXX ──
    if len(args) > 1 and args[1].startswith("bet_"):
        bet_code = args[1][4:]
        webapp_url = f"{settings.WEBAPP_URL}?startapp=bet_{bet_code}"

        # Try to fetch bet details for a rich invite message
        bet_info = None
        try:
            api_url = f"{settings.APP_URL}/v1/bets/preview/{bet_code}"
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=aiohttp.ClientTimeout(total=3)) as resp:
                    if resp.status == 200:
                        bet_info = await resp.json()
        except Exception as e:
            logger.debug(f"Failed to fetch bet preview: {e}")

        if bet_info:
            from datetime import datetime

            total = bet_info.get("yes_count", 0) + bet_info.get("no_count", 0)
            closes = bet_info.get("closes_at", "")
            closes_str = ""
            try:
                dt = datetime.fromisoformat(closes.replace("Z", "+00:00"))
                closes_str = dt.strftime("%d.%m.%Y %H:%M")
            except Exception:
                closes_str = closes[:16] if closes else ""

            text = (
                f"🤝 <b>Вас пригласили в спор!</b>\n\n"
                f"📌 <b>{bet_info.get('title', 'Спор')}</b>\n\n"
                f"💰 Ставка: <b>{bet_info.get('stake_amount', '?')} PRC</b>\n"
                f"🏦 Банк: <b>{bet_info.get('total_pool', '?')} PRC</b>\n"
                f"👥 Участников: <b>{total}</b> "
                f"(✅ ДА: {bet_info.get('yes_count', 0)} / "
                f"❌ НЕТ: {bet_info.get('no_count', 0)})\n"
                f"⏰ Приём ставок до: <b>{closes_str}</b>\n"
                f"👤 Создал: {bet_info.get('creator_name', '?')}\n\n"
                f"Выбери сторону и испытай удачу! 🔥"
            )
        else:
            text = (
                "🤝 <b>Вас пригласили в спор!</b>\n\n"
                f"Код: <code>{bet_code}</code>\n\n"
                "Нажмите кнопку ниже, чтобы присоединиться:"
            )

        await message.answer(
            text,
            reply_markup=Kb.open_market(webapp_url),
            parse_mode="HTML",
        )
        return

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
