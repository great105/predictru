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
                        text=f"{E.ROCKET} Открыть приложение",
                        web_app=WebAppInfo(url=webapp_url),
                    )
                ],
                [
                    InlineKeyboardButton(
                        text=f"{E.GLOBE} Веб-версия",
                        url=web_url,
                    )
                ],
                [
                    InlineKeyboardButton(
                        text=f"{E.MONEY} Мой баланс",
                        callback_data="quick_balance",
                    ),
                ],
            ]
        )

    @staticmethod
    def balance(webapp_url: str) -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"{E.BRIEFCASE} Мой портфель",
                        web_app=WebAppInfo(url=f"{webapp_url}/portfolio"),
                    )
                ],
                [
                    InlineKeyboardButton(
                        text=f"{E.HOUSE} На главную",
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
                        text=f"{E.CHART_UP} Посмотреть рынок",
                        callback_data=f"open_market:{market_id}",
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
                        text=f"{E.ROCKET} Открыть приложение",
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
                        text=f"{E.ROCKET} Открыть",
                        web_app=WebAppInfo(url=webapp_url),
                    )
                ]
            ]
        )
