import { clearAdminSession, getAdminSession, patchAdminSession } from "../store/adminSession";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Envelope<T> = {
  data: T;
};

type RefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
};

let refreshingPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    const session = getAdminSession();
    if (!session?.refreshToken) return null;
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      clearAdminSession();
      if (typeof window !== "undefined") window.location.href = "/admin";
      return null;
    }
    const json = (await response.json()) as Envelope<RefreshTokenResponse> | RefreshTokenResponse;
    const payload = (json && typeof json === "object" && "data" in (json as Record<string, unknown>))
      ? (json as Envelope<RefreshTokenResponse>).data
      : (json as RefreshTokenResponse);
    if (!payload?.accessToken) {
      clearAdminSession();
      if (typeof window !== "undefined") window.location.href = "/admin";
      return null;
    }
    patchAdminSession({ token: payload.accessToken, refreshToken: payload.refreshToken || session.refreshToken });
    return payload.accessToken;
  })();
  try {
    return await refreshingPromise;
  } finally {
    refreshingPromise = null;
  }
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const session = getAdminSession();
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && !retried) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAdminSession();
      if (typeof window !== "undefined") window.location.href = "/admin";
    }
    throw new Error(`request-failed-${response.status}`);
  }

  const json = (await response.json()) as Envelope<T> | T;
  if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
    return (json as Envelope<T>).data;
  }
  return json as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
