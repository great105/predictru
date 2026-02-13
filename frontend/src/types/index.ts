export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name?: string | null;
  photo_url?: string | null;
  balance: number;
  total_trades: number;
  total_profit: number;
  win_rate: number;
  referral_code: string;
  referral_count: number;
  daily_bonus_claimed_at?: string | null;
  is_admin?: boolean;
}

export interface Market {
  id: string;
  title: string;
  category: string;
  status: "open" | "trading_closed" | "resolved" | "cancelled";
  price_yes: number;
  price_no: number;
  total_volume: number;
  total_traders: number;
  closes_at: string;
  is_featured: boolean;
  created_at: string;
  amm_type: string;
}

export interface MarketDetail extends Market {
  description: string;
  image_url: string | null;
  amm_type: string;
  q_yes: number;
  q_no: number;
  liquidity_b: number;
  min_bet: number;
  max_bet: number;
  resolution_outcome: string | null;
  resolution_source: string;
  resolved_at: string | null;
  created_by: string | null;
}

export interface Position {
  id: string;
  user_id: string;
  market_id: string;
  outcome: "yes" | "no";
  shares: number;
  total_cost: number;
  avg_price: number;
  market_title: string | null;
  market_status: "open" | "trading_closed" | "resolved" | "cancelled" | null;
  resolution_outcome: string | null;
  market?: Market;
}

export interface TradeResult {
  shares?: number;
  shares_sold?: number;
  cost?: number;
  revenue?: number;
  price_yes: number;
  price_no: number;
  new_balance: number;
}

export interface PricePoint {
  price_yes: number;
  price_no: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
}

export interface Transaction {
  id: string;
  type: "buy" | "sell" | "payout" | "bonus" | "referral" | "daily" | "fee" | "deposit" | "withdraw" | "order_fill" | "order_cancel";
  amount: number;
  shares: number;
  outcome: string | null;
  description: string;
  created_at: string;
}

// --- Order Book (CLOB) types ---

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  last_price: number | null;
}

export interface UserOrder {
  id: string;
  market_id: string;
  side: string;
  price: number;
  quantity: number;
  filled_quantity: number;
  status: string;
  original_intent: string;
  created_at: string;
}

export interface TradeFillRecord {
  id: string;
  price: number;
  quantity: number;
  settlement_type: string;
  created_at: string;
}

export interface PlaceOrderResult {
  order_id: string;
  status: string;
  filled_quantity: number;
  remaining: number;
  fills_count: number;
}
