-- CLOB Order Book Migration
-- Run via: docker exec -i predictru-db-1 psql -U predictru -d predictru < migrations/clob_migration.sql

-- 1. Create enum types
DO $$ BEGIN
    CREATE TYPE orderside AS ENUM ('buy', 'sell');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE orderstatus AS ENUM ('open', 'partially_filled', 'filled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE orderintent AS ENUM ('buy_yes', 'buy_no', 'sell_yes', 'sell_no');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE settlementtype AS ENUM ('transfer', 'mint', 'burn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new enum values to transactiontype
ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'order_fill';
ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'order_cancel';

-- 3. Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    market_id UUID NOT NULL REFERENCES markets(id),
    side orderside NOT NULL,
    price NUMERIC(5, 2) NOT NULL,
    quantity NUMERIC(16, 6) NOT NULL,
    filled_quantity NUMERIC(16, 6) NOT NULL DEFAULT 0,
    status orderstatus NOT NULL DEFAULT 'open',
    original_intent orderintent NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_orders_book ON orders (market_id, side, status, price, created_at);
CREATE INDEX IF NOT EXISTS ix_orders_user_status ON orders (user_id, status);
CREATE INDEX IF NOT EXISTS ix_orders_market_status ON orders (market_id, status);

-- 4. Create trade_fills table
CREATE TABLE IF NOT EXISTS trade_fills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    buy_order_id UUID NOT NULL REFERENCES orders(id),
    sell_order_id UUID NOT NULL REFERENCES orders(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    price NUMERIC(5, 2) NOT NULL,
    quantity NUMERIC(16, 6) NOT NULL,
    fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    settlement_type settlementtype NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_trade_fills_market ON trade_fills (market_id, created_at);

-- 5. Add reserved_balance to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS reserved_balance NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 6. Add reserved_shares to positions
ALTER TABLE positions ADD COLUMN IF NOT EXISTS reserved_shares NUMERIC(16, 6) NOT NULL DEFAULT 0;

-- 7. Add last_trade_price_yes to markets
ALTER TABLE markets ADD COLUMN IF NOT EXISTS last_trade_price_yes NUMERIC(5, 2);

-- Done!
SELECT 'CLOB migration completed successfully' AS status;
