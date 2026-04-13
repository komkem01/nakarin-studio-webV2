type ApiEnvelope<T> = {
  data?: T
}

type RefreshTokenResponse = {
  accessToken?: string
  refreshToken?: string
  accessTokenExpiresIn?: number
  refreshTokenExpiresIn?: number
  access_token?: string
  refresh_token?: string
  access_token_expires_in?: number
  refresh_token_expires_in?: number
}

const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})

const pickString = (source: unknown, camel: string, snake: string) => {
  const data = asRecord(source)
  const a = data[camel]
  if (typeof a === 'string' && a.trim()) return a
  const b = data[snake]
  if (typeof b === 'string' && b.trim()) return b
  return ''
}

const pickNumber = (source: unknown, camel: string, snake: string, fallback: number) => {
  const data = asRecord(source)
  const raw = data[camel] ?? data[snake]
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export const useAdminSession = () => {
  const config = useRuntimeConfig()
  const refreshing = ref<Promise<string> | null>(null)

  const getCookieValue = (name: string) => {
    if (!import.meta.client) return ''
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
    return match ? decodeURIComponent(match[1]) : ''
  }

  const setCookie = (name: string, value: string, maxAge?: number) => {
    if (!import.meta.client) return
    const safeValue = encodeURIComponent(value)
    if (maxAge && Number.isFinite(maxAge) && maxAge > 0) {
      document.cookie = `${name}=${safeValue}; Path=/; Max-Age=${Math.floor(maxAge)}; SameSite=Lax`
      return
    }
    document.cookie = `${name}=${safeValue}; Path=/; SameSite=Lax`
  }

  const clearSession = async () => {
    if (import.meta.client) {
      localStorage.removeItem('ns_admin_auth')
      sessionStorage.removeItem('ns_admin_auth')
      document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax'
      document.cookie = 'refresh_token=; Path=/; Max-Age=0; SameSite=Lax'
      document.cookie = 'accesc_token=; Path=/; Max-Age=0; SameSite=Lax'
    }
    await navigateTo('/admin/auth/login')
  }

  const refreshAccessToken = async () => {
    if (refreshing.value) return refreshing.value

    refreshing.value = (async () => {
      const refreshToken = getCookieValue('refresh_token')
      if (!refreshToken) {
        throw new Error('missing-refresh-token')
      }

      const res = await $fetch<ApiEnvelope<RefreshTokenResponse>>('/api/v1/auth/refresh-token', {
        method: 'POST',
        baseURL: config.public.apiBase,
        body: { refreshToken },
      })

      const payload = res?.data || {}
      const nextAccessToken = pickString(payload, 'accessToken', 'access_token')
      const nextRefreshToken = pickString(payload, 'refreshToken', 'refresh_token') || refreshToken
      const nextAccessExp = pickNumber(payload, 'accessTokenExpiresIn', 'access_token_expires_in', 60 * 60 * 24)
      const nextRefreshExp = pickNumber(payload, 'refreshTokenExpiresIn', 'refresh_token_expires_in', 60 * 60 * 24 * 7)

      if (!nextAccessToken) {
        throw new Error('invalid-refresh-response')
      }

      setCookie('access_token', nextAccessToken, nextAccessExp)
      setCookie('refresh_token', nextRefreshToken, nextRefreshExp)
      return nextAccessToken
    })()

    try {
      return await refreshing.value
    } finally {
      refreshing.value = null
    }
  }

  const authFetch = async <T>(url: string, options?: Parameters<typeof $fetch<T>>[1], retried = false): Promise<T> => {
    const accessToken = getCookieValue('access_token')
    const headers = {
      ...(options?.headers as Record<string, string> | undefined),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }

    try {
      return await $fetch<T>(url, {
        baseURL: config.public.apiBase,
        ...options,
        headers,
      })
    } catch (error) {
      const e = error as { statusCode?: number, response?: { status?: number } }
      const status = e?.statusCode || e?.response?.status
      if (retried || status !== 401 || url.includes('/api/v1/auth/refresh-token')) {
        throw error
      }

      const nextAccessToken = await refreshAccessToken()
      return await $fetch<T>(url, {
        baseURL: config.public.apiBase,
        ...options,
        headers: {
          ...(options?.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${nextAccessToken}`,
        },
      })
    }
  }

  return {
    authFetch,
    refreshAccessToken,
    clearSession,
  }
}
