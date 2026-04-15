type ApiEnvelope<T> = {
  code?: string
  message?: string
  data: T
}

type LoginPayload = {
  phone: string
  password: string
}

type RegisterPayload = {
  genderId: string
  prefixId: string
  firstName: string
  lastName: string
  phone: string
  password: string
}

type SessionMember = {
  id: string
  firstName: string
  lastName: string
  role: 'admin' | 'customer'
}

type AuthTokensResponse = {
  tokenType: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
  refreshTokenExpiresIn: number
  member: SessionMember
}

const SESSION_KEY = 'ns_auth'
const REMEMBER_PREF_KEY = 'ns_customer_remember_me'
const ACCESS_COOKIE = 'customer_access_token'
const REFRESH_COOKIE = 'customer_refresh_token'

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const pickStr = (o: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

const pickNum = (o: Record<string, unknown>, ...keys: string[]): number => {
  for (const k of keys) {
    const v = Number(o[k])
    if (Number.isFinite(v) && v > 0) return v
  }
  return 0
}

const normalizeTokens = (data: unknown): AuthTokensResponse => {
  const d = asRecord(data)
  const m = asRecord(d.member)
  return {
    tokenType: pickStr(d, 'tokenType', 'token_type') || 'Bearer',
    accessToken: pickStr(d, 'accessToken', 'access_token'),
    refreshToken: pickStr(d, 'refreshToken', 'refresh_token'),
    accessTokenExpiresIn: pickNum(d, 'accessTokenExpiresIn', 'access_token_expires_in'),
    refreshTokenExpiresIn: pickNum(d, 'refreshTokenExpiresIn', 'refresh_token_expires_in'),
    member: {
      id: pickStr(m, 'id'),
      firstName: pickStr(m, 'firstName', 'first_name'),
      lastName: pickStr(m, 'lastName', 'last_name'),
      role: (pickStr(m, 'role') as 'admin' | 'customer') || 'customer',
    },
  }
}

const setCookie = (name: string, value: string, maxAge: number, persistent = true) => {
  if (!import.meta.client) return
  if (persistent && Number.isFinite(maxAge) && maxAge > 0) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.floor(maxAge)}; SameSite=Lax`
    return
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`
}

const clearCookies = () => {
  if (!import.meta.client) return
  document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  document.cookie = `${REFRESH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

const getCookieValue = (name: string): string => {
  if (!import.meta.client) return ''
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : ''
}

export const useCustomerAuth = () => {
  const config = useRuntimeConfig()

  const isRememberPreferred = () => {
    if (!import.meta.client) return false
    return !!localStorage.getItem(SESSION_KEY)
  }

  // ── Session ──────────────────────────────────────────────────────────────

  const getSession = () => {
    if (!import.meta.client) return null
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as { member: SessionMember }) : null
    } catch {
      return null
    }
  }

  const saveSession = (tokens: AuthTokensResponse, remember: boolean) => {
    if (!import.meta.client) return
    const payload = { member: tokens.member }

    if (remember) {
      sessionStorage.removeItem(SESSION_KEY)
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload))
    } else {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
    }

    const defaultAccessAge = 60 * 5
    const defaultRefreshAge = 60 * 60 * 24 * 7
    setCookie(ACCESS_COOKIE, tokens.accessToken, tokens.accessTokenExpiresIn || defaultAccessAge, remember)
    setCookie(REFRESH_COOKIE, tokens.refreshToken, tokens.refreshTokenExpiresIn || defaultRefreshAge, remember)
  }

  const clearSession = async () => {
    if (import.meta.client) {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(REMEMBER_PREF_KEY)
      sessionStorage.removeItem(SESSION_KEY)
      clearCookies()
    }
    await navigateTo('/auth/login')
  }

  // ── API ───────────────────────────────────────────────────────────────────

  const apiFetch = <T>(url: string, options?: Parameters<typeof $fetch>[1]) =>
    $fetch<T>(url, { baseURL: config.public.apiBase, ...options })

  const authFetch = async <T>(url: string, options?: Parameters<typeof $fetch>[1]): Promise<T> => {
    const accessToken = getCookieValue(ACCESS_COOKIE)
    const headers = {
      ...(options?.headers as Record<string, string> | undefined),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }
    try {
      return await $fetch<T>(url, { baseURL: config.public.apiBase, ...options, headers })
    } catch (error) {
      const e = error as { statusCode?: number }
      if (e?.statusCode !== 401) throw error

      // Try refresh
      const refreshToken = getCookieValue(REFRESH_COOKIE)
      if (!refreshToken) {
        await clearSession()
        throw error
      }
      const res = await apiFetch<ApiEnvelope<{ accessToken?: string; access_token?: string; accessTokenExpiresIn?: number; access_token_expires_in?: number }>>(
        '/api/v1/auth/refresh-token',
        { method: 'POST', body: { refreshToken } },
      )
      const d = asRecord(res?.data)
      const newToken = pickStr(d, 'accessToken', 'access_token')
      const newExp = pickNum(d, 'accessTokenExpiresIn', 'access_token_expires_in')
      if (newToken) setCookie(ACCESS_COOKIE, newToken, newExp || 300, isRememberPreferred())

      return await $fetch<T>(url, {
        baseURL: config.public.apiBase,
        ...options,
        headers: { ...(options?.headers as Record<string, string> | undefined), Authorization: `Bearer ${newToken}` },
      })
    }
  }

  const login = async (payload: LoginPayload, remember = false) => {
    const res = await apiFetch<ApiEnvelope<unknown>>('/api/v1/auth/login', {
      method: 'POST',
      body: payload,
    })
    const tokens = normalizeTokens(res.data)
    saveSession(tokens, remember)
    return tokens
  }

  const register = async (payload: RegisterPayload) => {
    const res = await apiFetch<ApiEnvelope<unknown>>('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    })
    const tokens = normalizeTokens(res.data)
    saveSession(tokens, false)
    return tokens
  }

  const getGenders = async () => {
    const res = await apiFetch<ApiEnvelope<{ id: string; name: string }[]>>('/api/v1/systems/genders')
    return res.data || []
  }

  const getPrefixesByGenderId = async (genderId: string) => {
    const res = await apiFetch<ApiEnvelope<{ id: string; name: string }[]>>(`/api/v1/systems/prefixes/gender/${genderId}`)
    return res.data || []
  }

  return {
    getSession,
    saveSession,
    clearSession,
    authFetch,
    login,
    register,
    getGenders,
    getPrefixesByGenderId,
  }
}
