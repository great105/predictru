# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PredictRu** is a prediction market platform with dual frontends: a Telegram Mini App and a standalone desktop-first website. Users trade YES/NO outcome shares on events using virtual currency (PRC). The platform supports two trading modes: LMSR (automated market maker) and CLOB (central limit order book).

**Domain**: предскажи.рф (punycode: `xn--80ahcgkj6ail.xn--p1ai`)
**Bot**: @predskazu_bot
**Admin Telegram ID**: 5722788755

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
- **nginx** (80/443) - Reverse proxy, rate limiting (30r/s API, 5r/s auth), builds & serves both frontends + SSL via Let's Encrypt

### Nginx & Frontend Build Pipeline

The nginx Dockerfile (`nginx/Dockerfile`) has a **multi-stage build** that compiles both frontends:
1. **Stage `miniapp-build`**: Builds `frontend/` (Mini App) → `dist/`
2. **Stage `web-build`**: Builds `web/` (Desktop site) → `dist/`
3. **Stage nginx**: Copies Mini App to `/usr/share/nginx/html/` (served at `/`), Web to `/usr/share/nginx/web/` (served at `/web`)

To rebuild frontends: `docker compose build --no-cache nginx && docker compose up -d --force-recreate nginx`

**Important**: `nginx/html/` directory in git contains a legacy pre-built Mini App. It is NOT used in production — the Docker build compiles from `frontend/` source. Do not rely on `nginx/html/` for deployments.

### Backend (`backend/`)

**Entry point**: `app/main.py` - FastAPI app with all routers under `/v1` prefix.

**API routers** (`app/api/`): auth, markets, trade (LMSR), orderbook (CLOB), users, admin, analytics, ugc, comments, b2b

**Auth flow (dual)**:
- **Mini App**: Telegram `initData` → HMAC-SHA256 validation via `core/security.py` → JWT
- **Web**: Bot-based deep link auth → `POST /v1/auth/bot-login-init` generates token → user opens `https://t.me/predskazu_bot?start=login_TOKEN` → bot confirms via Redis → web polls `GET /v1/auth/bot-login-status/TOKEN` → JWT
- Both share the same user table and JWT tokens
- Redis key pattern: `web_login:{token}` with 5min TTL for auth bridge between bot and backend

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

**Key stores**:
- `authStore` — user, JWT token
- `orderbookStore` — orderType (buy/sell), selectedOutcome (yes/no), price, quantity — shared between `LimitOrderForm` and `OrderBookDisplay` (tap-to-fill)

**CLOB trading form** (`LimitOrderForm.tsx`): Exchange-style UI with BUY/SELL toggle, YES/NO toggle, price stepper (0.01–0.99), quantity presets (5/10/25/50), order summary. Uses `orderbookStore` for state. Intent = `${orderType}_${selectedOutcome}`.

**Navigation**: 3 tabs — Рынки, Портфель, Профиль (+ Админ for admin users). No Leaderboard tab.

**API client** (`api/client.ts`): Axios instance with base URL `/v1`, auto-injects Bearer token from localStorage, auto-clears on 401.

**Telegram Mini App integration**: `main.tsx` calls `WebApp.ready()`, `.expand()`, `.disableVerticalSwipes()`, `.setBackgroundColor('#0a0e1a')`, `.setHeaderColor('#0a0e1a')` before React renders. Auth gate in `App.tsx` blocks rendering until JWT obtained.

**Dark glassmorphism theme**: Forced dark theme independent of Telegram's light/dark mode. Body background uses `!important` to override Telegram's inline styles. Tailwind `tg.*` colors are hardcoded dark values (not CSS variables). Glass cards use `backdrop-filter: blur(16px)` + `rgba(255,255,255,0.06)`. Shimmer skeletons via CSS animation. Confetti on successful trades (canvas-confetti). Haptic feedback on interactions. Framer Motion page transitions.

**Test files**: `src/__tests__/` is excluded from `tsconfig.json` — tests run via vitest only, not tsc. Always `import { vi }` explicitly in test files.

**Horizontal scroll prevention**: `overflow-x: hidden` on html/body in `index.css`, `flex-wrap` on all chip/tag rows, `overflow-x-hidden` on Layout root div.

### Frontend — Web (`web/`)

React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + Recharts + Zustand + React Query. Desktop-first responsive design.

**Design system**: "Financial Editorial" aesthetic — Outfit (display) + Manrope (body) + IBM Plex Mono (data). Teal-cyan accent (#06d6a0), deep navy base (#0a0e1a), 1440px max content width.

**Key files**:
- `tailwind.config.ts` — Color system (base-950..300, brand, amber, yes/no, txt hierarchy, line), fonts, max-w-site
- `src/index.css` — Component classes (card, btn-primary/secondary/ghost, chip, badge, input-field, text-gradient, shimmer)
- `src/components/Layout.tsx` — Horizontal top navbar (with conditional admin link), footer, mobile hamburger
- `src/pages/LoginPage.tsx` — Landing page with bot-based Telegram auth
- `src/pages/AdminPage.tsx` — Admin panel (market management, create form, FAQ guide)
- `src/adminApi.ts` — Admin API endpoints (separate from api.ts to avoid modifying shared files)

**Admin page** (`/admin`): Visible only to `is_admin` users. Three tabs: Рынки (list + resolve/cancel), Создать (market creation form), Справка (comprehensive FAQ with collapsible sections).

**Market detail page**: Shows resolution rules (`resolution_source`) in a dedicated card section.

**Auth**: Bot-based deep link auth (one-click, opens Telegram app). Flow: init token → open `t.me/predskazu_bot?start=login_TOKEN` → bot confirms via Redis → web polls for JWT.

**DO NOT modify** (shared auth/data logic): `api.ts`, `hooks.ts`, `store.ts`, `types.ts`, `main.tsx`. For admin API, use separate `adminApi.ts`. For new routes, `App.tsx` can be extended minimally.

### Bot (`bot/`)

aiogram 3 with aiohttp webhook server on port 8081. Russian-language UI with rich HTML formatting.

**Handlers**: /start (welcome + Mini App button + web login deep link handling), /balance (profile stats), /top (leaderboard), /notifications (settings)

**Web login bridge**: Bot handles `login_` deep links by writing confirmed user data to Redis (`web_login:{token}`), which backend polls to complete web auth.

**Startup**: Sets bot commands, MenuButtonWebApp (with `?v=timestamp` cache buster), description, short description.

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
3. `git fetch && git reset --hard` + `docker compose build --parallel` + `docker compose build --no-cache nginx` (force fresh frontend rebuild)
4. `docker compose up -d --remove-orphans --force-recreate nginx` + `docker compose restart nginx`
5. `seed_markets.py` — idempotent seed of prediction markets (skips existing)
6. Health check on `https://localhost/health` (12 attempts, 10s apart)

**CRITICAL**: `appleboy/ssh-action@v1` does NOT support `script_stop` — if `docker compose build` fails, the script continues and deploys the OLD image. Always verify frontend actually updated after deploy by checking the CSS/JS hash in the HTML response.

### Manual Deploy
```bash
ssh root@195.26.225.39 "cd /opt/predictru && git fetch origin main && git reset --hard origin/main && docker compose build --no-cache nginx && docker compose up -d --force-recreate && docker compose restart nginx"
```

**Required GitHub Secrets**:
- `DEPLOY_HOST` - Server IP/domain
- `DEPLOY_USER` - SSH username
- `DEPLOY_KEY` - Private SSH key

## Database Migrations

Three migrations:
- `001` — Initial schema (users, markets, positions, transactions, price_history, comments, market_proposals)
- `002` — B2B tables (api_keys, etc.)
- `003` — Missing columns + new tables (orders, trade_fills with enums: OrderSide, OrderStatus, OrderIntent, SettlementType; extended TransactionType)

### Seed Script (`backend/scripts/seed_markets.py`)
Idempotent script that creates initial prediction markets. Checks if markets already exist before inserting. Run inside API container: `docker compose exec -T api python scripts/seed_markets.py`. Categories: politics, economics, crypto, sports, general.

### SSH Access
Production server accessible via SSH: `ssh root@195.26.225.39`. Project at `/opt/predictru`.

## Known Pitfalls

- **Test DB cleanup**: Use `DROP SCHEMA public CASCADE; CREATE SCHEMA public` instead of `Base.metadata.drop_all` (asyncpg concurrency issue)
- **Test engine**: Must use `NullPool` to avoid event loop lifecycle issues
- **Test Redis**: Override dependency to create fresh connections per request (pool connections go stale across event loops)
- **SQLAlchemy relationships**: Always include `ForeignKey("table.col")` in `mapped_column` when adding `relationship()` - SA can't infer joins without it
- **Dockerfile**: `ENV PYTHONPATH=/app` is required so Alembic can import app modules
- **Telegram Desktop horizontal scroll**: Use `flex-wrap` for horizontal items, not `overflow-x-auto`. Global `overflow-x: hidden` on html/body in `index.css`. Add `min-w-0` on flex children that contain text
- **`@telegram-apps/sdk-react`**: Use v2.0.25 (v2.1.0 doesn't exist)
- **Bash + SQL**: Dollar amounts like `$10K` get interpreted as shell variables - use single quotes
- **Docker .env reload**: `docker compose restart` does NOT re-read .env. Use `docker compose up -d --force-recreate` instead
- **Alembic enums**: Don't manually `CREATE TYPE` + `create_type=False` — let `sa.Enum()` handle creation. `ALTER TYPE ADD VALUE` can't run inside transactions (wrap with `COMMIT`/`BEGIN`)
- **Domain punycode**: предскажи.рф = `xn--80ahcgkj6ail.xn--p1ai` (NOT `xn--e1afkbacb0ada8j`)
- **Nginx upstream DNS caching**: Nginx resolves upstream hostnames at startup and caches IPs. After `docker compose up -d` recreates API container (new IP), must `docker compose restart nginx` or health checks get 502
- **Nginx ghost containers**: If `docker compose up -d --force-recreate nginx` fails with "container is running", run `docker compose stop nginx` first, then `docker compose up -d nginx`
- **FastAPI router prefix**: Routers with `prefix="/auth"` — route decorators must NOT include `/auth` again (e.g., use `@router.post("/bot-login-init")` not `@router.post("/auth/bot-login-init")`)
- **Telegram Login Widget**: Asks users for phone number — not suitable for one-click login. Use bot-based deep link auth instead (`https://t.me/bot?start=login_TOKEN`)
- **nginx/html/ is stale**: The `nginx/html/` directory contains a legacy pre-built Mini App. Production builds from `frontend/` source via Docker multi-stage build. Don't update `nginx/html/` manually
- **Web admin API**: Use separate `web/src/adminApi.ts` for admin endpoints instead of modifying `api.ts`
- **Post-push deploy check**: After `git push` to `main`, always verify the deployment succeeded — check GitHub Actions CI/CD status (`gh run list --limit 1`) and confirm the production site is live (`curl -s https://xn--80ahcgkj6ail.xn--p1ai/health`). Also verify frontend updated: `curl -s https://xn--80ahcgkj6ail.xn--p1ai/` and check the JS/CSS hash in the HTML changed
- **tsc breaks Docker nginx build**: Test files (`src/__tests__/`) using vitest globals (`vi.mock`) or Node modules (`fs`) fail `tsc`. They MUST be excluded in `tsconfig.json` (`"exclude": ["src/__tests__"]`). Since `npm run build` = `tsc && vite build`, a tsc failure means NO frontend gets built, and the old Docker image is silently reused
- **Telegram WebView caching**: Telegram Desktop aggressively caches Mini App content. Standard HTTP no-cache headers are sometimes ignored. Fix: append `?v=timestamp` to the Mini App URL in `bot/main.py` `on_startup()` via `set_chat_menu_button()`. Bot restarts on every deploy → automatic cache bust
- **Telegram WebApp overrides body background**: `telegram-web-app.js` sets inline `background-color` on body (white in light theme). CSS variables `--tg-theme-bg-color` are also white in light theme. Fix: use `!important` on body background, call `setBackgroundColor()` / `setHeaderColor()` in `main.tsx`, and hardcode dark tg colors in `tailwind.config.js` instead of using CSS variables
- **ssh-action silent failures**: `appleboy/ssh-action@v1` ignores `script_stop: true` (unsupported param). If any command fails (e.g., `docker compose build`), the script continues — deploy looks green but uses old images. Health check passes because `/health` hits API container, not nginx
