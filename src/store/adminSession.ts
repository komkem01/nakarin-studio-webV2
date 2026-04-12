export type AdminRole = "owner" | "admin" | "staff";

export type AdminSession = {
  name: string;
  role: AdminRole;
  token?: string;
  refreshToken?: string;
};

const STORAGE_KEY = "nakarin_admin_session";

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function setAdminSession(session: AdminSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function patchAdminSession(partial: Partial<AdminSession>): void {
  const current = getAdminSession();
  if (!current) return;
  setAdminSession({ ...current, ...partial });
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasAnyRole(role: AdminRole, allowedRoles?: AdminRole[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(role);
}
