import { http } from "./http";

export type BookingItem = {
  id: string;
  bookingNo: string;
  status: string;
  payment: string;
  totalPrice?: number;
  createdAt: string;
};

export type PaginationMeta = {
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export type PaginatedBookingsResponse = {
  items: BookingItem[];
  meta: PaginationMeta;
};

export type AnalyticsPoint = {
  periodStart: string;
  periodEnd: string;
  totalBookings: number;
  totalRevenue: number;
  averageOrder: number;
  cumulativeBookings: number;
  cumulativeRevenue: number;
};

export type AnalyticsDailyResponse = {
  from: string;
  to: string;
  groupBy: string;
  timezone: string;
  series: AnalyticsPoint[];
};

export type ReportsOverviewResponse = {
  generatedAt: string;
  membersCount: number;
  memberAccountsCount: number;
  bookingsCount: number;
  categoriesCount: number;
  productsCount: number;
  promotionsCount: number;
};

export type ReportByStatusItem = {
  id: string;
  bookingNo: string;
  status: string;
  payment: string;
  createdAt: string;
};

export type ReportByStatusResponse = {
  status: string;
  total: number;
  page: number;
  size: number;
  totalPages: number;
  items: ReportByStatusItem[];
  generatedAt: string;
};

export async function fetchOrders(params: {
  page: number;
  size: number;
  sort: string;
  order: "asc" | "desc";
  q?: string;
  status?: string;
  payment?: string;
}): Promise<PaginatedBookingsResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("size", String(params.size));
  q.set("sort", params.sort);
  q.set("order", params.order);
  if (params.q) q.set("q", params.q);
  if (params.status) q.set("status", params.status);
  if (params.payment) q.set("payment", params.payment);
  return http.get<PaginatedBookingsResponse>(`/api/v1/bookings?${q.toString()}`);
}

export async function fetchAnalyticsDaily(params: { from?: string; to?: string; groupBy?: string; timezone?: string }): Promise<AnalyticsDailyResponse> {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.groupBy) q.set("groupBy", params.groupBy);
  if (params.timezone) q.set("timezone", params.timezone);
  return http.get<AnalyticsDailyResponse>(`/api/v1/reports/analytics/daily?${q.toString()}`);
}

export async function fetchReportsOverview(): Promise<ReportsOverviewResponse> {
  return http.get<ReportsOverviewResponse>("/api/v1/reports/overview");
}

export async function fetchReportsByStatus(params: {
  status: string;
  page: number;
  size: number;
  sort: string;
  order: "asc" | "desc";
  q?: string;
  from?: string;
  to?: string;
}): Promise<ReportByStatusResponse> {
  const q = new URLSearchParams();
  q.set("status", params.status);
  q.set("page", String(params.page));
  q.set("size", String(params.size));
  q.set("sort", params.sort);
  q.set("order", params.order);
  if (params.q) q.set("q", params.q);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  return http.get<ReportByStatusResponse>(`/api/v1/reports/bookings/by-status?${q.toString()}`);
}
