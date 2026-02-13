import api from "./client";
import type {
  Market,
  MarketDetail,
  OrderBook,
  PaginatedResponse,
  PlaceOrderResult,
  Position,
  PricePoint,
  PrivateBet,
  PrivateBetDetail,
  TradeFillRecord,
  TradeResult,
  Transaction,
  User,
  UserOrder,
} from "@/types";

export const authApi = {
  telegram: (initData: string) =>
    api.post<{ access_token: string; user: User }>("/auth/telegram", {
      init_data: initData,
    }),
};

export const marketsApi = {
  list: (params?: {
    category?: string;
    status?: string;
    cursor?: string;
    limit?: number;
  }) => api.get<PaginatedResponse<Market>>("/markets", { params }),

  get: (id: string) => api.get<MarketDetail>(`/markets/${id}`),

  history: (id: string) => api.get<PricePoint[]>(`/markets/${id}/history`),
};

export const tradeApi = {
  buy: (data: { market_id: string; outcome: string; amount: number }) =>
    api.post<TradeResult>("/trade/buy", data),

  sell: (data: { market_id: string; outcome: string; shares: number }) =>
    api.post<TradeResult>("/trade/sell", data),
};

export const usersApi = {
  me: () => api.get<User>("/users/me"),

  positions: () => api.get<Position[]>("/users/me/positions"),

  transactions: (params?: { limit?: number; cursor?: string }) =>
    api.get<PaginatedResponse<Transaction>>("/users/me/transactions", { params }),

  deposit: (amount: number) =>
    api.post<{ amount: number; new_balance: number; status: string }>("/users/me/deposit", { amount }),
};

export const adminApi = {
  createMarket: (data: {
    title: string;
    description?: string;
    category?: string;
    closes_at: string;
    amm_type?: string;
    is_featured?: boolean;
    resolution_source?: string;
    initial_price_yes?: number;
  }) => api.post<MarketDetail>("/admin/markets", data),

  updateMarket: (id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    is_featured?: boolean;
    resolution_source?: string;
  }) => api.put<MarketDetail>(`/admin/markets/${id}`, data),

  resolveMarket: (id: string, outcome: string) =>
    api.post<MarketDetail>(`/admin/markets/${id}/resolve`, { outcome }),

  cancelMarket: (id: string) =>
    api.post<MarketDetail>(`/admin/markets/${id}/cancel`),
};

export const orderbookApi = {
  placeOrder: (data: {
    market_id: string;
    intent: string;
    price: number;
    quantity: number;
  }) => api.post<PlaceOrderResult>("/orderbook/orders", data),

  cancelOrder: (orderId: string) =>
    api.delete<{ order_id: string; cancelled_quantity: number }>(
      `/orderbook/orders/${orderId}`
    ),

  getBook: (marketId: string) =>
    api.get<OrderBook>(`/orderbook/markets/${marketId}/book`),

  getTrades: (marketId: string, limit?: number) =>
    api.get<TradeFillRecord[]>(`/orderbook/markets/${marketId}/trades`, {
      params: { limit },
    }),

  getMyOrders: (params?: { market_id?: string; active_only?: boolean }) =>
    api.get<UserOrder[]>("/orderbook/orders/my", { params }),
};

export const betsApi = {
  create: (data: {
    title: string;
    description?: string;
    stake_amount: number;
    closes_at: string;
    outcome: string;
  }) => api.post<PrivateBet>("/bets", data),

  my: () => api.get<PrivateBet[]>("/bets/my"),

  get: (id: string) => api.get<PrivateBetDetail>(`/bets/${id}`),

  join: (data: { invite_code: string; outcome: string }) =>
    api.post<PrivateBet>("/bets/join", data),

  vote: (id: string, data: { vote: string }) =>
    api.post<PrivateBetDetail>(`/bets/${id}/vote`, data),

  lookup: (code: string) => api.get<PrivateBet>(`/bets/lookup/${code}`),
};
