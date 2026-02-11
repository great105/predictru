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

export interface UserBrief {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  balance: number;
  is_admin: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserBrief;
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

export interface PricePoint {
  price_yes: number;
  price_no: number;
  created_at: string;
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
  market_status: string | null;
  resolution_outcome: string | null;
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

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
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

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  shares: number;
  outcome: string | null;
  description: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string | null;
  first_name: string;
  total_profit: number;
  win_rate: number;
  total_trades: number;
}

export interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
}
