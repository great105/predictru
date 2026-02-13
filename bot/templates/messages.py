"""Message templates for the bot UI.

All user-supplied data must be passed through html.escape().
"""

import html

from templates.emoji import E


class Msg:
    """Message template factories. All return HTML strings."""

    @staticmethod
    def welcome(name: str, referral_param: str = "") -> str:
        safe_name = html.escape(name)
        return (
            f"Привет, <b>{safe_name}</b>! {E.WAVE}\n\n"
            f"{E.CHART} <b>ПредскажиРу</b> — рынок предсказаний нового поколения\n\n"
            f"Здесь ты можешь:\n"
            f"  {E.DOT} Торговать прогнозами на реальные события\n"
            f"  {E.DOT} Зарабатывать PRC-токены на точных предсказаниях\n"
            f"  {E.DOT} Соревноваться с другими трейдерами\n\n"
            f"{E.TARGET} <b>Политика {E.DOT} Спорт {E.DOT} Крипто {E.DOT} Экономика</b>\n\n"
            f"{E.POINT_DOWN} Нажми кнопку ниже, чтобы начать:"
        )

    @staticmethod
    def login_success() -> str:
        return (
            f"{E.SUCCESS} <b>Авторизация прошла успешно!</b>\n\n"
            "Вернитесь на вкладку браузера — "
            "вход произойдёт автоматически."
        )

    @staticmethod
    def login_used() -> str:
        return f"{E.WARNING} Этот токен уже использован."

    @staticmethod
    def login_expired() -> str:
        return f"{E.ERROR} Токен истёк. Обновите страницу сайта и попробуйте снова."

    @staticmethod
    def profile(balance: float, trades: int, win_rate: float) -> str:
        if win_rate >= 60:
            trend = E.FIRE
        elif win_rate >= 40:
            trend = E.SUCCESS
        else:
            trend = E.BULB

        return (
            f"{E.MONEY} <b>Твой профиль</b>\n\n"
            f"{E.CARD} Баланс: <b>{balance:,.2f} PRC</b>\n"
            f"{E.CHART_UP} Сделок: <b>{trades}</b>\n"
            f"{trend} Винрейт: <b>{win_rate}%</b>\n\n"
            f"{E.BULB} <i>Торгуй точнее — зарабатывай больше!</i>"
        )

    @staticmethod
    def not_found() -> str:
        return (
            f"{E.SILENT} Аккаунт не найден.\n\n"
            f"Открой приложение, чтобы зарегистрироваться {E.POINT_DOWN}"
        )

    @staticmethod
    def unavailable() -> str:
        return f"{E.WARNING} Сервис временно недоступен. Попробуй позже."

    @staticmethod
    def resolution_win(title: str, outcome: str, payout: float) -> str:
        safe_title = html.escape(title)
        outcome_label = "ДА" if outcome.lower() == "yes" else "НЕТ"
        return (
            f"{E.CONFETTI} <b>Твой прогноз сбылся!</b>\n\n"
            f"{E.PIN} {safe_title}\n"
            f"{E.TARGET} Исход: <b>{outcome_label}</b>\n"
            f"{E.MONEY} Выплата: <b>+{payout:.2f} PRC</b>\n\n"
            f"{E.FIRE} Так держать!"
        )

    @staticmethod
    def resolution_lose(title: str, outcome: str) -> str:
        safe_title = html.escape(title)
        outcome_label = "ДА" if outcome.lower() == "yes" else "НЕТ"
        return (
            f"{E.MEGAPHONE} <b>Рынок закрыт</b>\n\n"
            f"{E.PIN} {safe_title}\n"
            f"{E.TARGET} Исход: <b>{outcome_label}</b>\n\n"
            f"{E.MUSCLE} В следующий раз повезёт!"
        )

    @staticmethod
    def daily_digest(hot_markets: list[dict]) -> str:
        lines = [
            f"{E.SUN} <b>Доброе утро!</b>\n",
            f"{E.FIRE} <b>Горячие рынки сегодня:</b>\n",
        ]

        for i, m in enumerate(hot_markets[:5], 1):
            safe_title = html.escape(m["title"])
            price_pct = m["price_yes"] * 100
            volume = m.get("total_volume", 0)
            lines.append(
                f"  <b>{i}.</b> {safe_title}\n"
                f"     {E.CHART} Да: <b>{price_pct:.0f}%</b> {E.DOT} "
                f"Объём: <b>{volume:,.0f} PRC</b>\n"
            )

        lines.append(f"\n{E.POINT_DOWN} Открой приложение и торгуй!")
        return "\n".join(lines)

    @staticmethod
    def open_market_prompt() -> str:
        return f"{E.CHART_UP} Нажми, чтобы открыть рынок:"

    @staticmethod
    def open_app_prompt() -> str:
        return f"{E.CHART} Открой приложение и выбери рынок:"
