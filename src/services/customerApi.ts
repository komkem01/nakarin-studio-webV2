import { clearCustomerSession, getCustomerSession, patchCustomerSession } from "../store/customerSession";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Envelope<T> = {
  code: string;
  message: string;
  data: T;
};

export type GenderItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export type PrefixItem = {
  id: string;
  genderId: string;
  name: string;
  isActive: boolean;
};

export type AuthTokensResponse = {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};

export type ProductItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  price: number;
  stockQty: number;
  isActive: boolean;
};

export type ProductListResponse = {
  items: ProductItem[];
  total: number;
  page: number;
  limit: number;
};

export type BookingItem = {
  id: string;
  bookingNo: string;
  status: string;
  payment: string;
  packageName?: string;
  baiseeStyle?: string;
  eventDate?: string;
  scheduledAt?: string;
  deliveryAt?: string;
  basePrice?: number | null;
  addonPrice?: number | null;
  totalPrice?: number | null;
  depositAmount?: number | null;
  paidAmount?: number | null;
  balanceAmount?: number | null;
  statusUpdatedAt: string;
};

let refreshingPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    const session = getCustomerSession();
    if (!session?.refreshToken) return null;
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      clearCustomerSession();
      return null;
    }
    const json = (await response.json()) as Envelope<AuthTokensResponse>;
    if (!json?.data?.accessToken) {
      clearCustomerSession();
      return null;
    }
    patchCustomerSession({ token: json.data.accessToken, refreshToken: json.data.refreshToken || session.refreshToken });
    return json.data.accessToken;
  })();
  try {
    return await refreshingPromise;
  } finally {
    refreshingPromise = null;
  }
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const session = getCustomerSession();
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error("network-error");
  }
  if (response.status === 401) {
    if (!retried) {
      const token = await refreshAccessToken();
      if (token) return request<T>(path, init, true);
    }
    clearCustomerSession();
  }
  if (!response.ok) throw new Error(`request-failed-${response.status}`);
  const json = (await response.json()) as Envelope<T>;
  return json.data;
}

export const customerApi = {
  listGenders: () => request<GenderItem[]>("/api/v1/systems/genders"),
  listPrefixesByGender: (genderId: string) => request<PrefixItem[]>(`/api/v1/systems/prefixes/gender/${genderId}`),
  register: (body: {
    genderId: string;
    prefixId: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  }) => request<AuthTokensResponse>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { phone: string; password: string }) =>
    request<AuthTokensResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(body) }),
  listProducts: (params?: { q?: string; page?: number; limit?: number; categoryId?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.categoryId) q.set("category_id", params.categoryId);
    if (typeof params?.isActive === "boolean") q.set("is_active", String(params.isActive));
    q.set("page", String(params?.page || 1));
    q.set("limit", String(params?.limit || 20));
    return request<ProductListResponse>(`/api/v1/products?${q.toString()}`);
  },
  getProductById: (id: string) => request<ProductItem>(`/api/v1/products/${id}`),
  createBooking: (body: {
    bookingNo: string;
    payment?: string;
    packageName?: string;
    baiseeStyle?: string;
    eventDate?: string;
    scheduledAt?: string;
    deliveryAt?: string;
    basePrice: number;
    addonPrice: number;
    depositAmount: number;
    paidAmount: number;
  }) => request<BookingItem>("/api/v1/bookings", { method: "POST", body: JSON.stringify(body) }),
  getBookingById: (id: string) => request<BookingItem>(`/api/v1/bookings/${id}`),
};
