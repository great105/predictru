"""Seed 20 interesting prediction markets for Russian audience.

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
    # ── Политика ──
    {
        "title": "Путин проведёт пресс-конференцию до 1 июля 2026?",
        "description": "Рынок разрешится ДА, если Владимир Путин проведёт большую пресс-конференцию для СМИ до 1 июля 2026 года включительно.",
        "category": "politics",
        "closes_at": "2026-07-01",
        "initial_price": 0.72,
        "is_featured": True,
        "resolution_source": "Официальные СМИ (ТАСС, РИА Новости)",
    },
    {
        "title": "Россия и Украина подпишут перемирие до конца 2026?",
        "description": "Рынок разрешится ДА, если Россия и Украина подпишут официальное соглашение о прекращении огня/перемирии до 31 декабря 2026.",
        "category": "politics",
        "closes_at": "2026-12-31",
        "initial_price": 0.18,
        "is_featured": True,
        "resolution_source": "Официальные заявления правительств обеих стран",
    },
    {
        "title": "БРИКС примет нового члена на саммите 2026?",
        "description": "Рынок разрешится ДА, если на саммите БРИКС в 2026 году будет объявлено о присоединении хотя бы одной новой страны в качестве полного члена.",
        "category": "politics",
        "closes_at": "2026-11-01",
        "initial_price": 0.65,
        "is_featured": False,
        "resolution_source": "Итоговая декларация саммита БРИКС",
    },
    {
        "title": "Турция станет членом ШОС до конца 2026?",
        "description": "Рынок разрешится ДА, если Турция получит статус полноправного члена Шанхайской организации сотрудничества до 31 декабря 2026.",
        "category": "politics",
        "closes_at": "2026-12-31",
        "initial_price": 0.30,
        "is_featured": False,
        "resolution_source": "Официальные документы ШОС",
    },
    # ── Экономика ──
    {
        "title": "Ключевая ставка ЦБ РФ ниже 15% к октябрю 2026?",
        "description": "Рынок разрешится ДА, если ключевая ставка Банка России на заседании в октябре 2026 будет установлена ниже 15%.",
        "category": "economics",
        "closes_at": "2026-10-31",
        "initial_price": 0.35,
        "is_featured": True,
        "resolution_source": "Пресс-релиз Банка России по итогам заседания Совета директоров",
    },
    {
        "title": "Курс доллара превысит 110 рублей в 2026?",
        "description": "Рынок разрешится ДА, если официальный курс ЦБ РФ USD/RUB хотя бы на один день в 2026 году превысит 110 рублей за доллар.",
        "category": "economics",
        "closes_at": "2026-12-31",
        "initial_price": 0.40,
        "is_featured": True,
        "resolution_source": "Официальный курс ЦБ РФ (cbr.ru)",
    },
    {
        "title": "Инфляция в России за 2026 год ниже 6%?",
        "description": "Рынок разрешится ДА, если годовая инфляция (ИПЦ) в РФ за 2026 год по данным Росстата составит менее 6%.",
        "category": "economics",
        "closes_at": "2027-01-20",
        "initial_price": 0.22,
        "is_featured": False,
        "resolution_source": "Данные Росстата по ИПЦ за декабрь 2026",
    },
    {
        "title": "Московская биржа: индекс IMOEX выше 3500 к концу 2026?",
        "description": "Рынок разрешится ДА, если значение индекса Мосбиржи (IMOEX) на закрытие последнего торгового дня 2026 года будет выше 3500 пунктов.",
        "category": "economics",
        "closes_at": "2026-12-31",
        "initial_price": 0.55,
        "is_featured": False,
        "resolution_source": "Данные Московской биржи (moex.com)",
    },
    # ── Крипто ──
    {
        "title": "Bitcoin выше $150 000 к концу 2026?",
        "description": "Рынок разрешится ДА, если цена BTC/USD на CoinGecko на 31 декабря 2026 (00:00 UTC) будет выше $150,000.",
        "category": "crypto",
        "closes_at": "2026-12-31",
        "initial_price": 0.38,
        "is_featured": True,
        "resolution_source": "CoinGecko (coingecko.com) цена BTC на 31.12.2026",
    },
    {
        "title": "Ethereum выше $10 000 в 2026?",
        "description": "Рынок разрешится ДА, если цена ETH/USD на CoinGecko хотя бы один раз в 2026 году превысит $10,000.",
        "category": "crypto",
        "closes_at": "2026-12-31",
        "initial_price": 0.25,
        "is_featured": False,
        "resolution_source": "CoinGecko (coingecko.com) исторические данные ETH",
    },
    {
        "title": "Россия примет закон о цифровом рубле для граждан до конца 2026?",
        "description": "Рынок разрешится ДА, если до 31 декабря 2026 будет подписан закон, разрешающий широкое использование цифрового рубля физическими лицами (не пилот).",
        "category": "crypto",
        "closes_at": "2026-12-31",
        "initial_price": 0.45,
        "is_featured": False,
        "resolution_source": "Публикация закона на pravo.gov.ru",
    },
    # ── Спорт ──
    {
        "title": "Сборная России вернётся в отборочные турниры FIFA/UEFA в 2026?",
        "description": "Рынок разрешится ДА, если сборная России по футболу будет допущена к участию в официальных отборочных турнирах FIFA или UEFA до 31 декабря 2026.",
        "category": "sports",
        "closes_at": "2026-12-31",
        "initial_price": 0.12,
        "is_featured": True,
        "resolution_source": "Официальные решения FIFA/UEFA",
    },
    {
        "title": "Даниил Медведев выиграет турнир Большого Шлема в 2026?",
        "description": "Рынок разрешится ДА, если Даниил Медведев выиграет хотя бы один из четырёх турниров Большого Шлема (Australian Open, Roland Garros, Wimbledon, US Open) в 2026 году.",
        "category": "sports",
        "closes_at": "2026-09-15",
        "initial_price": 0.20,
        "is_featured": False,
        "resolution_source": "Официальные результаты ATP Tour",
    },
    {
        "title": "КХЛ: СКА выиграет Кубок Гагарина 2026?",
        "description": "Рынок разрешится ДА, если хоккейный клуб СКА (Санкт-Петербург) станет обладателем Кубка Гагарина по итогам сезона 2025/26.",
        "category": "sports",
        "closes_at": "2026-05-15",
        "initial_price": 0.18,
        "is_featured": False,
        "resolution_source": "Официальный сайт КХЛ (khl.ru)",
    },
    {
        "title": "Зенит станет чемпионом РПЛ сезона 2025/26?",
        "description": "Рынок разрешится ДА, если ФК Зенит (Санкт-Петербург) станет чемпионом Российской Премьер-Лиги по итогам сезона 2025/26.",
        "category": "sports",
        "closes_at": "2026-06-01",
        "initial_price": 0.60,
        "is_featured": True,
        "resolution_source": "Официальный сайт РПЛ (premierliga.ru)",
    },
    # ── Технологии / Наука ──
    {
        "title": "Яндекс запустит собственную LLM-модель уровня GPT-4 в 2026?",
        "description": "Рынок разрешится ДА, если Яндекс публично представит языковую модель, которая по бенчмаркам будет сопоставима с GPT-4 (по заявлению самого Яндекса или независимых тестов).",
        "category": "general",
        "closes_at": "2026-12-31",
        "initial_price": 0.50,
        "is_featured": False,
        "resolution_source": "Официальное объявление Яндекса и публичные бенчмарки",
    },
    {
        "title": "Роскосмос запустит миссию к Луне (Луна-26) в 2026?",
        "description": "Рынок разрешится ДА, если Роскосмос осуществит запуск автоматической межпланетной станции Луна-26 до 31 декабря 2026.",
        "category": "general",
        "closes_at": "2026-12-31",
        "initial_price": 0.28,
        "is_featured": False,
        "resolution_source": "Официальные сообщения Роскосмоса",
    },
    # ── Общество / Культура ──
    {
        "title": "Население Москвы официально превысит 14 млн в 2026?",
        "description": "Рынок разрешится ДА, если по данным Росстата численность населения Москвы на начало 2027 года превысит 14 миллионов человек.",
        "category": "general",
        "closes_at": "2027-02-01",
        "initial_price": 0.42,
        "is_featured": False,
        "resolution_source": "Данные Росстата о численности населения",
    },
    {
        "title": "Российский фильм попадёт в шорт-лист Оскара 2027?",
        "description": "Рынок разрешится ДА, если российский фильм войдёт в шорт-лист (не обязательно номинация) премии Оскар в любой категории по итогам сезона 2026 (церемония 2027).",
        "category": "general",
        "closes_at": "2027-01-15",
        "initial_price": 0.15,
        "is_featured": False,
        "resolution_source": "Официальный сайт Academy Awards (oscar.go.com)",
    },
    {
        "title": "Средняя зарплата в России превысит 100 000 руб./мес. в 2026?",
        "description": "Рынок разрешится ДА, если среднемесячная начисленная заработная плата по данным Росстата за любой месяц 2026 года превысит 100 000 рублей.",
        "category": "economics",
        "closes_at": "2027-02-15",
        "initial_price": 0.58,
        "is_featured": True,
        "resolution_source": "Данные Росстата о заработной плате",
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
