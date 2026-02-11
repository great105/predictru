from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from config import settings

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    # Check for deep link referral code
    args = message.text.split(maxsplit=1)
    referral_param = ""
    if len(args) > 1 and args[1].startswith("ref_"):
        referral_code = args[1][4:]
        referral_param = f"?ref={referral_code}"

    webapp_url = f"{settings.WEBAPP_URL}{referral_param}"

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Open PredictRu",
                    web_app=WebAppInfo(url=webapp_url),
                )
            ]
        ]
    )

    await message.answer(
        "Welcome to PredictRu!\n\n"
        "Predict the future and earn PRC tokens.\n"
        "Trade on prediction markets for politics, sports, crypto and more.\n\n"
        "Tap the button below to start:",
        reply_markup=keyboard,
    )
