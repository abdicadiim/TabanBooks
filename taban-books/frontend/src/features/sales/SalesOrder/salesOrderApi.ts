import { apiRequest } from "../../../services/api";

export const salesOrdersAPI = {
  getAll: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/sales-orders${queryString ? `?${queryString}` : ""}`);
  },
  getById: (id: any) => apiRequest(`/sales-orders/${id}`),
  create: (data: any) => apiRequest("/sales-orders", { method: "POST", body: data }),
  update: (id: any, data: any) => apiRequest(`/sales-orders/${id}`, { method: "PUT", body: data }),
  delete: (id: any) => apiRequest(`/sales-orders/${id}`, { method: "DELETE" }),
  getNextNumber: (prefix: string) =>
    apiRequest(`/sales-orders/next-number?prefix=${encodeURIComponent(prefix || "SO-")}`),
};
