"""Seed prediction markets for Russian audience.

Run inside the backend container:
    python scripts/seed_markets.py

Or via docker:
    docker compose exec api python scripts/seed_markets.py
"""

import asyncio
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.database import async_session
from app.models.market import Market

MARKETS = [
    # ═══════════════════════════════════════════
    # ПОЛИТИКА / ГЕОПОЛИТИКА
    # ═══════════════════════════════════════════
    {
        "title": "Россия и Украина: перемирие до конца 2026?",
        "description": "Рынок разрешится ДА, если Россия и Украина заключат публичное "
        "соглашение о прекращении огня до 31 декабря 2026. "
        "Переговоры в Абу-Даби (февраль 2026) продолжаются, но Москва "
        "отклонила предложение о безусловном прекращении огня. "
        "Polymarket даёт ~44% на перемирие до конца года.",
        "category": "politics",
        "closes_at": "2026-12-31",
        "initial_price": 0.40,
        "is_featured": True,
        "resolution_source": "Официальные заявления правительств обеих сторон, подтверждённые ТАСС/Reuters",
    },
    {
        "title": "Перемирие Россия-Украина до 1 апреля 2026?",
        "description": "Рынок разрешится ДА, если перемирие/прекращение огня будет "
        "достигнуто до 1 апреля 2026. Polymarket оценивает шансы на "
        "перемирие до конца марта в ~9%.",
        "category": "politics",
        "closes_at": "2026-04-01",
        "initial_price": 0.08,
        "is_featured": True,
        "resolution_source": "Официальные заявления + подтверждение ООН или ОБСЕ",
    },
    {
        "title": "Путин и Трамп проведут личную встречу до 1 июля 2026?",
        "description": "Рынок разрешится ДА, если Владимир Путин и Дональд Трамп "
        "проведут официальную двустороннюю встречу (очную) до 1 июля 2026.",
        "category": "politics",
        "closes_at": "2026-07-01",
        "initial_price": 0.55,
        "is_featured": True,
        "resolution_source": "Официальные СМИ (ТАСС, Reuters, AP)",
    },
    {
        "title": "БРИКС примет нового члена на саммите 2026?",
        "description": "Рынок разрешится ДА, если на саммите БРИКС 2026 будет "
        "объявлено о присоединении хотя бы одной новой страны "
        "в качестве полного члена.",
        "category": "politics",
        "closes_at": "2026-11-01",
        "initial_price": 0.62,
        "is_featured": False,
        "resolution_source": "Итоговая декларация саммита БРИКС",
    },
    {
        "title": "Размещение иностранных войск на Украине до конца 2026?",
        "description": "Рынок разрешится ДА, если войска Великобритании, Франции или "
        "другой страны будут официально размещены на территории Украины "
        "до 31 декабря 2026. Парижские переговоры (январь 2026) обсуждали "
        "«военные хабы» Великобритании и Франции.",
        "category": "politics",
        "closes_at": "2026-12-31",
        "initial_price": 0.22,
        "is_featured": False,
        "resolution_source": "Официальные заявления правительств + подтверждение размещения",
    },
    # ═══════════════════════════════════════════
    # ЭКОНОМИКА РОССИИ
    # ═══════════════════════════════════════════
    {
        "title": "ЦБ снизит ключевую ставку на заседании 14 марта?",
        "description": "Рынок разрешится ДА, если Банк России снизит ключевую "
        "ставку (сейчас 16%) на заседании 14 марта 2026. "
        "На заседании 13 февраля большинство аналитиков ожидают паузу.",
        "category": "economics",
        "closes_at": "2026-03-14",
        "initial_price": 0.35,
        "is_featured": True,
        "resolution_source": "Пресс-релиз Банка России",
    },
    {
        "title": "Ключевая ставка ЦБ ниже 14% к концу 2026?",
        "description": "Рынок разрешится ДА, если ключевая ставка Банка России "
        "на последнем заседании 2026 года будет установлена ниже 14%. "
        "Текущая ставка: 16%.",
        "category": "economics",
        "closes_at": "2026-12-31",
        "initial_price": 0.30,
        "is_featured": True,
        "resolution_source": "Пресс-релиз Банка России по итогам заседания Совета директоров",
    },
    {
        "title": "Курс доллара выше 85 рублей в 2026?",
        "description": "Рынок разрешится ДА, если официальный курс ЦБ РФ USD/RUB "
        "хотя бы на один день в 2026 году превысит 85 рублей. "
        "Текущий курс: ~77 руб. Аналитики прогнозируют диапазон 74–85.",
        "category": "economics",
        "closes_at": "2026-12-31",
        "initial_price": 0.38,
        "is_featured": True,
        "resolution_source": "Официальный курс ЦБ РФ (cbr.ru)",
    },
    {
        "title": "Доллар ниже 70 рублей в 2026?",
        "description": "Рынок разрешится ДА, если официальный курс ЦБ РФ USD/RUB "
        "хотя бы на один день в 2026 году опустится ниже 70 руб. "
        "Текущий курс: ~77 руб. В январе курс опускался до 76.",
        "category": "economics",
        "closes_at": "2026-12-31",
        "initial_price": 0.15,
        "is_featured": False,
        "resolution_source": "Официальный курс ЦБ РФ (cbr.ru)",
    },
    {
        "title": "Годовая инфляция в России ниже 5% к декабрю 2026?",
        "description": "Рынок разрешится ДА, если годовая инфляция (ИПЦ г/г) "
        "в декабре 2026 по данным Росстата составит менее 5%. "
        "Текущая годовая инфляция: 6.4%. Таргет ЦБ: 4-5%.",
        "category": "economics",
        "closes_at": "2027-01-20",
        "initial_price": 0.28,
        "is_featured": False,
        "resolution_source": "Данные Росстата по ИПЦ за декабрь 2026",
    },
    {
        "title": "Индекс Мосбиржи (IMOEX) выше 3500 к концу 2026?",
        "description": "Рынок разрешится ДА, если значение индекса IMOEX "
        "на закрытие последнего торгового дня 2026 будет выше 3500 пунктов.",
        "category": "economics",
        "closes_at": "2026-12-31",
        "initial_price": 0.50,
        "is_featured": False,
        "resolution_source": "Данные Московской биржи (moex.com)",
    },
    {
        "title": "Средняя зарплата в РФ превысит 100 000 руб./мес. в 2026?",
        "description": "Рынок разрешится ДА, если среднемесячная начисленная "
        "заработная плата по данным Росстата за любой месяц 2026 года "
        "превысит 100 000 рублей.",
        "category": "economics",
        "closes_at": "2027-02-15",
        "initial_price": 0.55,
        "is_featured": False,
        "resolution_source": "Данные Росстата о заработной плате",
    },
    {
        "title": "Рост ВВП России выше 1.5% за 2026 год?",
        "description": "Рынок разрешится ДА, если рост реального ВВП России "
        "за 2026 год по первой оценке Росстата составит более 1.5%. "
        "Прогноз: стагнация ~1% из-за санкций и роста НДС до 22%.",
        "category": "economics",
        "closes_at": "2027-02-15",
        "initial_price": 0.35,
        "is_featured": False,
        "resolution_source": "Первая оценка Росстата за 2026 год",
    },
    # ═══════════════════════════════════════════
    # КРИПТО
    # ═══════════════════════════════════════════
    {
        "title": "Bitcoin вернётся выше $100 000 в 2026?",
        "description": "Рынок разрешится ДА, если цена BTC/USD на CoinGecko "
        "хотя бы раз в 2026 году превысит $100,000. "
        "Текущая цена: ~$66K. ATH был $126K (октябрь 2025). "
        "С тех пор падение на 48%.",
        "category": "crypto",
        "closes_at": "2026-12-31",
        "initial_price": 0.32,
        "is_featured": True,
        "resolution_source": "CoinGecko (coingecko.com) исторические данные BTC",
    },
    {
        "title": "Bitcoin упадёт ниже $50 000 в 2026?",
        "description": "Рынок разрешится ДА, если цена BTC/USD на CoinGecko "
        "хотя бы раз в 2026 году опустится ниже $50,000. "
        "Текущая цена: ~$66K. В начале февраля было падение до $60K.",
        "category": "crypto",
        "closes_at": "2026-12-31",
        "initial_price": 0.30,
        "is_featured": False,
        "resolution_source": "CoinGecko (coingecko.com) исторические данные BTC",
    },
    {
        "title": "Ethereum выше $5 000 в 2026?",
        "description": "Рынок разрешится ДА, если цена ETH/USD на CoinGecko "
        "хотя бы раз в 2026 году превысит $5,000.",
        "category": "crypto",
        "closes_at": "2026-12-31",
        "initial_price": 0.20,
        "is_featured": False,
        "resolution_source": "CoinGecko (coingecko.com) исторические данные ETH",
    },
    {
        "title": "Цифровой рубль доступен гражданам до конца 2026?",
        "description": "Рынок разрешится ДА, если цифровой рубль станет "
        "доступен для использования физическими лицами (не только пилот) "
        "до 31 декабря 2026.",
        "category": "crypto",
        "closes_at": "2026-12-31",
        "initial_price": 0.38,
        "is_featured": False,
        "resolution_source": "Официальные заявления ЦБ РФ и публикация нормативных актов",
    },
    # ═══════════════════════════════════════════
    # СПОРТ
    # ═══════════════════════════════════════════
    {
        "title": "Металлург Магнитогорск — обладатель Кубка Гагарина 2026?",
        "description": "Рынок разрешится ДА, если ХК «Металлург» (Магнитогорск) "
        "выиграет Кубок Гагарина КХЛ сезона 2025/26. "
        "Металлург лидирует в регулярке: 53 очка в 34 играх.",
        "category": "sports",
        "closes_at": "2026-05-15",
        "initial_price": 0.22,
        "is_featured": True,
        "resolution_source": "Официальный сайт КХЛ (khl.ru)",
    },
    {
        "title": "Зенит — чемпион РПЛ сезона 2025/26?",
        "description": "Рынок разрешится ДА, если ФК «Зенит» (Санкт-Петербург) "
        "станет чемпионом Российской Премьер-Лиги 2025/26. "
        "Весенняя часть сезона начнётся 27 февраля.",
        "category": "sports",
        "closes_at": "2026-06-01",
        "initial_price": 0.55,
        "is_featured": True,
        "resolution_source": "Официальный сайт РПЛ (premierliga.ru)",
    },
    {
        "title": "Медведев выиграет турнир Большого Шлема в 2026?",
        "description": "Рынок разрешится ДА, если Даниил Медведев выиграет "
        "хотя бы один из турниров Большого Шлема "
        "(Roland Garros, Wimbledon, US Open) в 2026 году.",
        "category": "sports",
        "closes_at": "2026-09-15",
        "initial_price": 0.12,
        "is_featured": False,
        "resolution_source": "Официальные результаты ATP Tour",
    },
    {
        "title": "Сборная России допущена к турнирам FIFA/UEFA в 2026?",
        "description": "Рынок разрешится ДА, если бан на участие сборной России "
        "в турнирах FIFA или UEFA будет снят до 31 декабря 2026.",
        "category": "sports",
        "closes_at": "2026-12-31",
        "initial_price": 0.08,
        "is_featured": False,
        "resolution_source": "Официальные решения FIFA/UEFA",
    },
    {
        "title": "Ак Барс Казань — обладатель Кубка Гагарина 2026?",
        "description": "Рынок разрешится ДА, если ХК «Ак Барс» (Казань) "
        "выиграет Кубок Гагарина КХЛ сезона 2025/26. "
        "Ак Барс — 3-е место в регулярке: 48 очков.",
        "category": "sports",
        "closes_at": "2026-05-15",
        "initial_price": 0.15,
        "is_featured": False,
        "resolution_source": "Официальный сайт КХЛ (khl.ru)",
    },
    # ═══════════════════════════════════════════
    # ТЕХНОЛОГИИ / НАУКА
    # ═══════════════════════════════════════════
    {
        "title": "Яндекс представит LLM-модель уровня GPT-4o в 2026?",
        "description": "Рынок разрешится ДА, если Яндекс публично представит "
        "языковую модель, которая по публичным бенчмаркам будет "
        "сопоставима с GPT-4o или выше.",
        "category": "general",
        "closes_at": "2026-12-31",
        "initial_price": 0.42,
        "is_featured": False,
        "resolution_source": "Официальное объявление Яндекса и публичные бенчмарки",
    },
    {
        "title": "Роскосмос запустит миссию Луна-26 в 2026?",
        "description": "Рынок разрешится ДА, если Роскосмос осуществит запуск АМС "
        "«Луна-26» до 31 декабря 2026. После неудачи Луны-25 в 2023 "
        "сроки неоднократно сдвигались.",
        "category": "general",
        "closes_at": "2026-12-31",
        "initial_price": 0.18,
        "is_featured": False,
        "resolution_source": "Официальные сообщения Роскосмоса",
    },
    {
        "title": "Число пользователей Telegram превысит 1 млрд в 2026?",
        "description": "Рынок разрешится ДА, если Павел Дуров или Telegram "
        "официально объявят о достижении 1 млрд активных пользователей "
        "в месяц до 31 декабря 2026.",
        "category": "general",
        "closes_at": "2026-12-31",
        "initial_price": 0.55,
        "is_featured": False,
        "resolution_source": "Официальные заявления Telegram / Павла Дурова",
    },
    {
        "title": "НДС 22%: инфляция в январе 2026 выше 2%?",
        "description": "Рынок разрешится ДА, если инфляция за январь 2026 "
        "(месяц к месяцу) по данным Росстата превысит 2%. "
        "С 1 января 2026 НДС повышен с 20% до 22%. "
        "По предварительным данным, уже ~1.9% за первые 3 недели.",
        "category": "economics",
        "closes_at": "2026-02-15",
        "initial_price": 0.82,
        "is_featured": False,
        "resolution_source": "Данные Росстата по ИПЦ за январь 2026",
    },
    {
        "title": "Российский IT-сектор: IPO крупной компании в 2026?",
        "description": "Рынок разрешится ДА, если хотя бы одна российская "
        "IT-компания (капитализация > 50 млрд руб.) проведёт IPO "
        "на Мосбирже в 2026 году.",
        "category": "general",
        "closes_at": "2026-12-31",
        "initial_price": 0.45,
        "is_featured": False,
        "resolution_source": "Данные Московской биржи (moex.com)",
    },
]


async def seed():
    async with async_session() as db:
        # Check if markets already exist
        result = await db.execute(select(Market).limit(1))
        if result.scalar_one_or_none():
            print("Markets already exist, skipping seed.")
            return

        for m in MARKETS:
            closes_str = m["closes_at"]
            closes_at = datetime.strptime(closes_str, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )

            market = Market(
                id=uuid.uuid4(),
                title=m["title"],
                description=m["description"],
                category=m["category"],
                closes_at=closes_at,
                amm_type="clob",
                is_featured=m.get("is_featured", False),
                resolution_source=m.get("resolution_source", ""),
                last_trade_price_yes=Decimal(str(m["initial_price"])),
                liquidity_b=Decimal("100"),
                min_bet=Decimal("1"),
                max_bet=Decimal("10000"),
            )
            db.add(market)
            print(f"  + {m['title'][:60]}... ({m['category']}, {m['initial_price']})")

        await db.commit()
        print(f"\nSeeded {len(MARKETS)} markets.")


if __name__ == "__main__":
    asyncio.run(seed())
