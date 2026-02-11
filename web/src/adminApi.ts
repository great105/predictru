import api from "./api";
import type { Market, PaginatedResponse } from "./types";

export const adminApi = {
  listAll: (params?: { cursor?: string; limit?: number }) =>
    api.get<PaginatedResponse<Market>>("/markets", { params: { ...params, limit: params?.limit ?? 50 } }).then((r) => r.data),

  createMarket: (data: {
    title: string;
    description: string;
    category: string;
    closes_at: string;
    amm_type: string;
    is_featured: boolean;
    resolution_source: string;
    initial_price_yes: number;
  }) => api.post("/admin/markets", data).then((r) => r.data),

  resolveMarket: (id: string, outcome: string) =>
    api.post(`/admin/markets/${id}/resolve`, { outcome }).then((r) => r.data),

  cancelMarket: (id: string) =>
    api.post(`/admin/markets/${id}/cancel`).then((r) => r.data),
};
