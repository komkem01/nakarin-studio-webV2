// ── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "admin";
export type Gender = "male" | "female" | "other";
export type TitlePrefix = "นาย" | "นาง" | "นางสาว" | "ดร." | "รศ." | "ศ." | "อื่นๆ";

export type EventType =
  | "wedding"
  | "ordination"
  | "housewarming"
  | "blessing"
  | "graduation"
  | "other";

export type OrderMode = "preset" | "custom_own" | "custom_from_product";

export type OrderStatus =
  | "pending"
  | "quoted"
  | "confirmed"
  | "in_progress"
  | "done"
  | "cancelled";

export type QuoteStatus = "pending" | "accepted" | "rejected";

// ── Address ──────────────────────────────────────────────────────────────────

export interface Province {
  id: string;
  code: string;
  name_th: string;
  name_en: string;
}

export interface District {
  id: string;
  code: string;
  name_th: string;
  name_en: string;
  province_id: string;
}

export interface SubDistrict {
  id: string;
  code: string;
  name_th: string;
  name_en: string;
  district_id: string;
  postal_code: string;
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  role: UserRole;
  title_prefix: TitlePrefix | null;
  gender: Gender | null;
  name: string;
  phone: string;
  email: string | null;
  address_line: string | null;
  sub_district_id: string | null;
  postal_code: string | null;
  created_at: string;
}

// ── Product ──────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  is_main: boolean;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_type: EventType;
  price_start: number | null;
  color_tags: string[];
  service_areas: string[];
  is_featured: boolean;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  images: ProductImage[] | null;
  created_at: string;
}

// ── Order ────────────────────────────────────────────────────────────────────

export interface OrderNote {
  id: string;
  order_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface Quote {
  id: string;
  order_id: string;
  amount: number;
  note: string | null;
  file_url: string | null;
  status: QuoteStatus;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  order_mode: OrderMode;
  product_id: string | null;
  event_date: string;
  event_location: string;
  event_sub_district_id: string | null;
  event_postal_code: string | null;
  event_type: EventType;
  budget_min: number | null;
  budget_max: number | null;
  color_notes: string | null;
  customization_notes: string | null;
  status: OrderStatus;
  customer: User | null;
  quotes: Quote[] | null;
  created_at: string;
}

// ── API Response wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  code: string;
  message: string;
  data: T[];
  total: number;
  page: number;
  size: number;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokenPayload {
  token: string;
  user: User;
}
