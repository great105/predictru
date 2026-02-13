"""Message templates for the bot UI.

All user-supplied data must be passed through html.escape().
Design principle: explain everything for a total beginner.
No jargon. Frame as a prediction game, not a trading platform.
"""

import html

from templates.emoji import E

NUMBERS = ["", E.N1, E.N2, E.N3, E.N4, E.N5]


class Msg:
    """Message template factories. All return HTML strings."""

    # ── Onboarding ──

    @staticmethod
    def welcome(name: str) -> str:
        safe_name = html.escape(name)
        return (
            f"Привет, <b>{safe_name}</b>! {E.WAVE}\n\n"
            f"{E.CRYSTAL} <b>ПредскажиРу</b> {E.DASH} игра в прогнозы\n\n"
            f"Как это работает:\n"
            f"{E.POINT_RIGHT} Берёшь вопрос {E.DASH} например,\n"
            f"    <i>«Биткоин дороже $100K к июлю?»</i>\n"
            f"{E.POINT_RIGHT} Ставишь на <b>ДА</b> или <b>НЕТ</b>\n"
            f"{E.POINT_RIGHT} Угадал {E.DASH} забираешь монеты!\n\n"
            f"{E.GIFT} Тебе уже начислено <b>1 000 PRC</b> на старте\n\n"
            f"{E.POINT_DOWN} Нажми и попробуй {E.DASH} это бесплатно:"
        )

    @staticmethod
    def how_it_works() -> str:
        return (
            f"{E.CRYSTAL} <b>Как играть в ПредскажиРу</b>\n\n"
            f"<b>1.</b> Выбери вопрос из списка\n"
            f"    <i>Например: «ЦБ снизит ставку в апреле?»</i>\n\n"
            f"<b>2.</b> Поставь монеты на <b>ДА</b> или <b>НЕТ</b>\n"
            f"    <i>Чем меньше людей согласны с тобой {E.DASH}\n"
            f"    тем больше ты заработаешь</i>\n\n"
            f"<b>3.</b> Жди результат\n"
            f"    <i>Когда событие произойдёт (или нет) {E.DASH}\n"
            f"    монеты начислятся автоматически</i>\n\n"
            f"{E.COIN} <b>PRC</b> {E.DASH} это игровые монеты.\n"
            f"Каждый получает <b>1 000 PRC</b> на старте.\n\n"
            f"{E.BULB} <i>Совет: начни с маленьких ставок,\n"
            f"пока разберёшься!</i>"
        )

    # ── Auth ──

    @staticmethod
    def login_success() -> str:
        return (
            f"{E.SUCCESS} <b>Вы вошли!</b>\n\n"
            "Вернитесь на вкладку браузера {E.DASH}\n"
            "вход произойдёт автоматически."
        ).replace("{E.DASH}", E.DASH)

    @staticmethod
    def login_used() -> str:
        return (
            f"{E.WARNING} Эта ссылка уже использована.\n\n"
            f"Откройте сайт заново и нажмите «Войти»."
        )

    @staticmethod
    def login_expired() -> str:
        return (
            f"{E.CLOCK} Ссылка устарела.\n\n"
            f"Откройте сайт заново и нажмите «Войти» {E.DASH}\n"
            f"вы получите новую ссылку."
        )

    # ── Profile ──

    @staticmethod
    def profile(balance: float, trades: int, win_rate: float) -> str:
        if win_rate >= 60:
            trend = E.FIRE
            hint = "Отличная интуиция!"
        elif win_rate >= 40:
            trend = E.SUCCESS
            hint = "Хороший результат, так держать!"
        elif trades > 0:
            trend = E.BULB
            hint = "Попробуй анализировать вопросы глубже"
        else:
            trend = E.STAR
            hint = "Сделай первый прогноз!"

        lines = [
            f"{E.PERSON} <b>Твой профиль</b>\n",
            f"{E.COIN} На счету: <b>{balance:,.0f} PRC</b>",
        ]
        if trades > 0:
            lines.append(f"{E.CHART} Прогнозов: <b>{trades}</b>")
            lines.append(f"{trend} Угадано: <b>{win_rate:.0f}%</b>")
        lines.append(f"\n{E.BULB} <i>{hint}</i>")
        return "\n".join(lines)

    @staticmethod
    def not_found() -> str:
        return (
            f"{E.WAVE} Ты ещё не зарегистрирован.\n\n"
            f"Нажми кнопку ниже {E.DASH} регистрация моментальная!"
        )

    @staticmethod
    def unavailable() -> str:
        return (
            f"{E.WARNING} Сервис временно недоступен.\n"
            f"Попробуй через пару минут."
        )

    # ── Notifications: resolution ──

    @staticmethod
    def resolution_win(title: str, outcome: str, payout: float) -> str:
        safe_title = html.escape(title)
        answer = "ДА" if outcome.lower() == "yes" else "НЕТ"
        return (
            f"{E.CONFETTI} <b>Ты угадал!</b>\n\n"
            f"{E.QUESTION} «{safe_title}»\n"
            f"{E.SUCCESS} Ответ: <b>{answer}</b>\n\n"
            f"{E.MONEY} Тебе начислено: <b>+{payout:,.0f} PRC</b>\n\n"
            f"{E.FIRE} Отличная интуиция!"
        )

    @staticmethod
    def resolution_lose(title: str, outcome: str) -> str:
        safe_title = html.escape(title)
        answer = "ДА" if outcome.lower() == "yes" else "НЕТ"
        return (
            f"{E.SCROLL} <b>Результат вопроса</b>\n\n"
            f"{E.QUESTION} «{safe_title}»\n"
            f"{E.SUCCESS} Ответ: <b>{answer}</b>\n\n"
            f"Твоя ставка не сыграла.\n"
            f"Но на платформе ещё много вопросов {E.POINT_DOWN}"
        )

    # ── Notifications: trade ──

    @staticmethod
    def trade_confirmation(
        title: str, outcome: str, shares: float, cost: float
    ) -> str:
        safe_title = html.escape(title)
        side = "ДА" if outcome.lower() == "yes" else "НЕТ"
        return (
            f"{E.SUCCESS} <b>Прогноз принят!</b>\n\n"
            f"{E.QUESTION} {safe_title}\n"
            f"{E.TARGET} Ты поставил на: <b>{side}</b>\n"
            f"{E.CARD} Ставка: <b>{cost:,.0f} PRC</b>\n\n"
            f"Результат появится после закрытия вопроса.\n"
            f"Удачи! {E.CLOVER}"
        )

    # ── Daily digest ──

    @staticmethod
    def daily_digest(hot_markets: list[dict]) -> str:
        lines = [
            f"{E.SUN} <b>Доброе утро!</b>\n",
            "Вот что обсуждают прямо сейчас:\n",
        ]

        for i, m in enumerate(hot_markets[:5], 1):
            safe_title = html.escape(m["title"])
            price_pct = m["price_yes"] * 100
            num = NUMBERS[i] if i < len(NUMBERS) else f"<b>{i}.</b>"
            lines.append(
                f"{num} {safe_title}\n"
                f"     {E.ARROW} <b>{price_pct:.0f}%</b> думают что ДА\n"
            )

        lines.append(f"Согласен? Поставь свой прогноз {E.POINT_DOWN}")
        return "\n".join(lines)

    # ── Inline prompts ──

    @staticmethod
    def open_market_prompt() -> str:
        return f"{E.POINT_DOWN} Нажми, чтобы открыть вопрос:"

    @staticmethod
    def open_app_prompt() -> str:
        return f"{E.CRYSTAL} Выбери вопрос и сделай прогноз:"
