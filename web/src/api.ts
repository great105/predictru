import axios from "axios";
import type {
  AuthResponse,
  Market,
  MarketDetail,
  OrderBook,
  PaginatedResponse,
  Position,
  PricePoint,
  TelegramLoginData,
  TradeResult,
  Transaction,
  User,
  UserOrder,
  LeaderboardEntry,
} from "./types";

const api = axios.create({
  baseURL: "/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  telegramLogin: (data: TelegramLoginData) =>
    api.post<AuthResponse>("/auth/telegram-login", data).then((r) => r.data),
};

export const marketsApi = {
  list: (params: { category?: string; status?: string; cursor?: string; limit?: number }) =>
    api.get<PaginatedResponse<Market>>("/markets", { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<MarketDetail>(`/markets/${id}`).then((r) => r.data),
  history: (id: string) =>
    api.get<PricePoint[]>(`/markets/${id}/history`).then((r) => r.data),
};

export const tradeApi = {
  buy: (data: { market_id: string; outcome: string; amount: number }) =>
    api.post<TradeResult>("/trade/buy", data).then((r) => r.data),
  sell: (data: { market_id: string; outcome: string; shares: number }) =>
    api.post<TradeResult>("/trade/sell", data).then((r) => r.data),
};

export const orderbookApi = {
  getBook: (marketId: string) =>
    api.get<OrderBook>(`/orderbook/markets/${marketId}/book`).then((r) => r.data),
  placeOrder: (data: { market_id: string; intent: string; price: number; quantity: number }) =>
    api.post("/orderbook/orders", data).then((r) => r.data),
  cancelOrder: (orderId: string) =>
    api.delete(`/orderbook/orders/${orderId}`).then((r) => r.data),
  getMyOrders: (params?: { market_id?: string; active_only?: boolean }) =>
    api.get<UserOrder[]>("/orderbook/orders/my", { params }).then((r) => r.data),
};

export const usersApi = {
  me: () => api.get<User>("/users/me").then((r) => r.data),
  positions: () => api.get<Position[]>("/users/me/positions").then((r) => r.data),
  transactions: (params?: { limit?: number; cursor?: string }) =>
    api.get<PaginatedResponse<Transaction>>("/users/me/transactions", { params }).then((r) => r.data),
  deposit: (amount: number) =>
    api.post("/users/me/deposit", { amount }).then((r) => r.data),
  dailyBonus: () =>
    api.post("/users/me/daily-bonus").then((r) => r.data),
  leaderboard: (period?: string) =>
    api.get<LeaderboardEntry[]>("/users/leaderboard", { params: { period } }).then((r) => r.data),
};

export default api;
