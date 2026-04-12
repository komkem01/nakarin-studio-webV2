export type CustomerSession = {
  token: string;
  refreshToken: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type TrackedBooking = {
  id: string;
  bookingNo: string;
};

const SESSION_KEY = "nakarin_customer_session";
const TRACKED_KEY = "nakarin_customer_tracked_bookings";
export const CUSTOMER_TOKEN_COOKIE = "nakarin_customer_token";

function setCustomerTokenCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CUSTOMER_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

function clearCustomerTokenCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CUSTOMER_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerSession;
  } catch {
    return null;
  }
}

export function setCustomerSession(session: CustomerSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setCustomerTokenCookie(session.token);
}

export function patchCustomerSession(partial: Partial<CustomerSession>): void {
  const current = getCustomerSession();
  if (!current) return;
  const next = { ...current, ...partial };
  setCustomerSession(next);
}

export function clearCustomerSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  clearCustomerTokenCookie();
}

export function getTrackedBookings(): TrackedBooking[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TRACKED_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TrackedBooking[];
  } catch {
    return [];
  }
}

export function addTrackedBooking(item: TrackedBooking): void {
  if (typeof window === "undefined") return;
  const existing = getTrackedBookings();
  if (existing.some((x) => x.id === item.id)) return;
  window.localStorage.setItem(TRACKED_KEY, JSON.stringify([item, ...existing]));
}
