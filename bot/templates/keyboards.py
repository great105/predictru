"""Keyboard factories for the bot UI."""

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from templates.emoji import E


class Kb:
    """Inline keyboard factories."""

    @staticmethod
    def start(webapp_url: str, web_url: str) -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"{E.PLAY} Начать играть",
                        web_app=WebAppInfo(url=webapp_url),
                    )
                ],
                [
                    InlineKeyboardButton(
                        text=f"{E.THINKING} Как это работает?",
                        callback_data="how_it_works",
                    ),
                    InlineKeyboardButton(
                        text=f"{E.GLOBE} Сайт",
                        url=web_url,
                    ),
                ],
            ]
        )

    @staticmethod
    def how_it_works(webapp_url: str) -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"{E.PLAY} Попробовать",
                        web_app=WebAppInfo(url=webapp_url),
                    )
                ],
            ]
        )

    @staticmethod
    def balance(webapp_url: str) -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"{E.CHART} Мои прогнозы",
                        web_app=WebAppInfo(url=f"{webapp_url}/portfolio"),
                    )
                ],
                [
                    InlineKeyboardButton(
                        text=f"{E.CRYSTAL} Все вопросы",
                        web_app=WebAppInfo(url=webapp_url),
                    )
                ],
            ]
        )

    @staticmethod
    def resolution(market_id: str) -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"{E.CRYSTAL} Новые вопросы",
                        callback_data="open_market:home",
                    )
                ],
                [
                    InlineKeyboardButton(
                        text=f"{E.ERROR} Закрыть",
                        callback_data="dismiss",
                    )
                ],
            ]
        )

    @staticmethod
    def digest() -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"{E.PLAY} Сделать прогноз",
                        callback_data="open_market:home",
                    )
                ]
            ]
        )

    @staticmethod
    def open_market(webapp_url: str) -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"{E.PLAY} Открыть",
                        web_app=WebAppInfo(url=webapp_url),
                    )
                ]
            ]
        )

    @staticmethod
    def open_market_with_text(webapp_url: str, text: str) -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=text,
                        web_app=WebAppInfo(url=webapp_url),
                    )
                ]
            ]
        )
