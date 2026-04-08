import axios from "axios";
import type {
  ApiResponse,
  PaginatedResponse,
  AuthTokenPayload,
  Product,
  Order,
  Province,
  District,
  SubDistrict,
  OrderNote,
  Quote,
} from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Inject Bearer token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: {
    name: string;
    phone: string;
    password: string;
    email?: string;
  }) => api.post<ApiResponse<AuthTokenPayload>>("/auth/register", body),

  login: (body: { phone: string; password: string }) =>
    api.post<ApiResponse<AuthTokenPayload>>("/auth/login", body),
};

// ── Products ─────────────────────────────────────────────────────────────────

export const productApi = {
  list: (params?: {
    event_type?: string;
    color_tag?: string;
    area?: string;
    is_featured?: boolean;
    page?: number;
    size?: number;
  }) => api.get<PaginatedResponse<Product>>("/products", { params }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Product>>(`/products/${slug}`),
};

// ── Orders ───────────────────────────────────────────────────────────────────

export const orderApi = {
  create: (body: {
    order_mode: string;
    product_id?: string;
    event_date: string;
    event_location: string;
    event_sub_district_id?: string;
    event_type: string;
    budget_min?: number;
    budget_max?: number;
    color_notes?: string;
    customization_notes?: string;
  }) => api.post<ApiResponse<Order>>("/orders", body),

  getById: (id: string) => api.get<ApiResponse<Order>>(`/orders/${id}`),

  addNote: (id: string, content: string) =>
    api.post<ApiResponse<OrderNote>>(`/orders/${id}/notes`, { content }),
};

// ── Address ──────────────────────────────────────────────────────────────────

export const addressApi = {
  listProvinces: () =>
    api.get<ApiResponse<Province[]>>("/address/provinces"),

  listDistricts: (provinceId: string) =>
    api.get<ApiResponse<District[]>>(
      `/address/provinces/${provinceId}/districts`
    ),

  listSubDistricts: (districtId: string) =>
    api.get<ApiResponse<SubDistrict[]>>(
      `/address/districts/${districtId}/sub-districts`
    ),

  search: (q: string) =>
    api.get<ApiResponse<SubDistrict[]>>("/address/search", { params: { q } }),
};

// ── Admin: Products ──────────────────────────────────────────────────────────

export const adminProductApi = {
  create: (body: FormData | object) =>
    api.post<ApiResponse<Product>>("/admin/products", body),

  update: (id: string, body: Partial<Product>) =>
    api.patch<ApiResponse<Product>>(`/admin/products/${id}`, body),

  delete: (id: string) => api.delete(`/admin/products/${id}`),
};

// ── Admin: Orders ─────────────────────────────────────────────────────────────

export const adminOrderApi = {
  list: (params?: {
    status?: string;
    event_type?: string;
    page?: number;
    size?: number;
  }) =>
    api.get<PaginatedResponse<Order>>("/admin/orders", { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Order>>(`/admin/orders/${id}`),

  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/admin/orders/${id}/status`, { status, note }),

  createQuote: (
    id: string,
    body: { amount: number; note?: string; file_url?: string }
  ) => api.post<ApiResponse<Quote>>(`/admin/orders/${id}/quotes`, body),

  addNote: (id: string, content: string, is_internal = true) =>
    api.post<ApiResponse<OrderNote>>(`/admin/orders/${id}/notes`, {
      content,
      is_internal,
    }),
};

export default api;
