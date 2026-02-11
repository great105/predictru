# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PredictRu** is a prediction market platform with dual frontends: a Telegram Mini App and a standalone desktop-first website. Users trade YES/NO outcome shares on events using virtual currency (PRC). The platform supports two trading modes: LMSR (automated market maker) and CLOB (central limit order book).

**Domain**: предскажи.рф (punycode: `xn--80ahcgkj6ail.xn--p1ai`)
**Bot**: @predskazu_bot

## Build & Run Commands

### Full Stack (Docker)
```bash
# Production
docker compose up --build

# Development (hot-reload, exposed ports)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# With monitoring (Prometheus + Grafana)
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build
```

### Backend Only
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Mini App)
```bash
cd frontend
npm ci
npm run dev          # Dev server with proxy to localhost:8000
npm run build        # tsc && vite build
npm run lint         # eslint src/
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
```

### Web (Desktop Site)
```bash
cd web
npm ci
npm run dev          # Dev server
npm run build        # tsc && vite build
```

### Backend Tests
```bash
cd backend
# Requires running PostgreSQL and Redis (use dev compose or local)
APP_ENV=test python -m pytest tests/ -v
python -m pytest tests/test_trade.py -v          # Single file
python -m pytest tests/test_trade.py::test_buy -v # Single test
```

### Linting
```bash
pip install ruff
ruff check backend/
ruff format --check backend/
```

### Database Migrations
```bash
cd backend
alembic upgrade head                          # Apply migrations
alembic revision --autogenerate -m "desc"     # Generate new migration
```

### Taskiq Workers
```bash
taskiq worker app.tasks.broker:broker --fs-discover          # Worker
taskiq scheduler app.tasks.scheduler:scheduler --fs-discover # Scheduler
```

## Architecture

### Services (docker-compose.yml)
- **postgres** (5432) - PostgreSQL 16, exposed on 5433 in dev
- **redis** (6379) - Cache + Taskiq broker, 128MB max, LRU eviction
- **api** (8000) - FastAPI, 2 uvicorn workers (production)
- **bot** (8081) - aiogram 3 via aiohttp webhook server
- **taskiq-worker** - Async task consumer
- **taskiq-scheduler** - Cron-scheduled tasks (leaderboard refresh, market auto-close, daily digests)
- **nginx** (80/443) - Reverse proxy, rate limiting (30r/s API, 5r/s auth), serves both frontends + SSL via Let's Encrypt

### Backend (`backend/`)

**Entry point**: `app/main.py` - FastAPI app with all routers under `/v1` prefix.

**API routers** (`app/api/`): auth, markets, trade (LMSR), orderbook (CLOB), users, admin, analytics, ugc, comments, b2b

**Auth flow (dual)**:
- **Mini App**: Telegram `initData` → HMAC-SHA256 validation via `core/security.py` → JWT
- **Web**: Telegram Login Widget → SHA256(bot_token) validation via `core/security.py` → JWT
- Both share the same user table and JWT tokens

**Dual-mode trading**:
- `market.amm_type == "lmsr"` → `TradeService` (`services/trade.py`) uses LMSR MarketMaker for buy/sell
- `market.amm_type == "clob"` → `OrderBookService` (`services/order_book.py`) runs a price-time priority matching engine
- New markets default to CLOB; LMSR is legacy

**CLOB Single-Book design**: One order book per market (YES side only). User intents are translated:
- `BUY_NO` → `SELL` @ `(1 - price)` on the book
- `SELL_NO` → `BUY` @ `(1 - price)` on the book
- Three settlement types: Transfer (shares change hands), Mint (create YES+NO pair), Burn (destroy pair, return PRC)

**MarketMaker protocol** (`services/market_maker/base.py`): Uses `typing.Protocol` (structural typing) with `MarketState` dataclass. LMSR implementation uses logsumexp trick for numerical stability.

**Concurrency control**: `SELECT FOR UPDATE` on market + user rows for all trade operations.

**Caching**: Redis with key patterns `market:{id}`, `markets:list:*`, `orderbook:{id}`, `leaderboard:{period}`. Markets list cached 30s, orderbook 1s.

**Pagination**: Cursor-based using UUID as cursor (fetches `limit+1` to detect `has_next`).

**Models** (`app/models/`): All use UUID primary keys (`UUIDMixin`) and timestamps (`TimestampMixin`). Key models: User, Market (with MarketStatus enum), Order (with OrderSide/OrderStatus/OrderIntent enums), Position, TradeFill (with SettlementType enum), Transaction, Comment, MarketProposal, PriceHistory.

### Frontend — Mini App (`frontend/`)

React 18 + Vite + TypeScript + TailwindCSS. Path alias: `@/` → `src/`. Designed for Telegram webview (mobile-first).

**State management**: Zustand stores (`stores/`) for auth, trade, orderbook. React Query (`@tanstack/react-query`) for server state with 30s staleTime.

**API client** (`api/client.ts`): Axios instance with base URL `/v1`, auto-injects Bearer token from localStorage, auto-clears on 401.

**Telegram Mini App integration**: `main.tsx` calls `WebApp.ready()`, `.expand()`, `.disableVerticalSwipes()` before React renders. Auth gate in `App.tsx` blocks rendering until JWT obtained.

### Frontend — Web (`web/`)

React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + Recharts + Zustand + React Query. Desktop-first responsive design.

**Design system**: "Financial Editorial" aesthetic — Outfit (display) + Manrope (body) + IBM Plex Mono (data). Teal-cyan accent (#06d6a0), deep navy base (#0a0e1a), 1440px max content width.

**Key files**:
- `tailwind.config.ts` — Color system (base-950..300, brand, amber, yes/no, txt hierarchy, line), fonts, max-w-site
- `src/index.css` — Component classes (card, btn-primary/secondary/ghost, chip, badge, input-field, text-gradient, shimmer)
- `src/components/Layout.tsx` — Horizontal top navbar, footer, mobile hamburger
- `src/pages/LoginPage.tsx` — Landing page with Telegram Login Widget

**Auth**: Telegram Login Widget (one-click, no typing). Same backend API `/v1/auth/telegram-login`.

**DO NOT modify**: `api.ts`, `hooks.ts`, `store.ts`, `types.ts`, `App.tsx`, `main.tsx` — shared logic that works for both auth flows.

### Bot (`bot/`)

aiogram 3 with aiohttp webhook server on port 8081. Russian-language UI with rich HTML formatting.

**Handlers**: /start (welcome + Mini App button), /balance (profile stats), /top (leaderboard), /notifications (settings)

**Startup**: Sets bot commands, MenuButtonWebApp, description, short description.

Webhook path: `/webhook/bot`.

### Scheduled Tasks (`backend/app/tasks/`)

Uses Taskiq with Redis broker. Cron-scheduled via `LabelScheduleSource`:
- `*/5 * * * *` - Refresh leaderboard cache
- `* * * * *` - Auto-close expired markets (OPEN → TRADING_CLOSED)
- `0 6 * * *` - Daily digest notifications (09:00 MSK)

## Deployment

### Production Server
- **IP**: 195.26.225.39
- **Project path**: `/opt/predictru`
- **SSL**: Let's Encrypt via certbot (auto-renewal cron)

### Environment
Copy `.env.example` to `.env`. Key variables: `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, `ADMIN_TELEGRAM_IDS` (comma-separated), `APP_URL`, `WEBAPP_URL`, `TELEGRAM_BOT_USERNAME`. `APP_ENV=test` switches Taskiq to in-memory broker.

### Repository
**GitHub**: https://github.com/great105/predictru

### CI/CD (GitHub Actions)

#### CI (`ci.yml`)
- `backend-lint` - ruff check + format
- `backend-test` - pytest against real Postgres/Redis services
- `frontend-lint` - eslint
- `frontend-test` - vitest

#### Deploy (`deploy.yml`)
Auto-deploys on push to `main` branch:
1. Runs CI first (`needs: ci`)
2. SSH into production server at `/opt/predictru`
3. `git fetch && git reset --hard` + `docker compose build --parallel` + `docker compose up -d`
4. Health check on `https://localhost/health`

**Required GitHub Secrets**:
- `DEPLOY_HOST` - Server IP/domain
- `DEPLOY_USER` - SSH username
- `DEPLOY_KEY` - Private SSH key

## Database Migrations

Three migrations:
- `001` — Initial schema (users, markets, positions, transactions, price_history, comments, market_proposals)
- `002` — B2B tables (api_keys, etc.)
- `003` — Missing columns + new tables (orders, trade_fills with enums: OrderSide, OrderStatus, OrderIntent, SettlementType; extended TransactionType)

## Known Pitfalls

- **Test DB cleanup**: Use `DROP SCHEMA public CASCADE; CREATE SCHEMA public` instead of `Base.metadata.drop_all` (asyncpg concurrency issue)
- **Test engine**: Must use `NullPool` to avoid event loop lifecycle issues
- **Test Redis**: Override dependency to create fresh connections per request (pool connections go stale across event loops)
- **SQLAlchemy relationships**: Always include `ForeignKey("table.col")` in `mapped_column` when adding `relationship()` - SA can't infer joins without it
- **Dockerfile**: `ENV PYTHONPATH=/app` is required so Alembic can import app modules
- **Telegram Desktop**: No horizontal scroll via mouse wheel. Use `flex-wrap` for horizontal items, not `overflow-x-auto`
- **`@telegram-apps/sdk-react`**: Use v2.0.25 (v2.1.0 doesn't exist)
- **Bash + SQL**: Dollar amounts like `$10K` get interpreted as shell variables - use single quotes
- **Docker .env reload**: `docker compose restart` does NOT re-read .env. Use `docker compose up -d --force-recreate` instead
- **Alembic enums**: Don't manually `CREATE TYPE` + `create_type=False` — let `sa.Enum()` handle creation. `ALTER TYPE ADD VALUE` can't run inside transactions (wrap with `COMMIT`/`BEGIN`)
- **Domain punycode**: предскажи.рф = `xn--80ahcgkj6ail.xn--p1ai` (NOT `xn--e1afkbacb0ada8j`)
