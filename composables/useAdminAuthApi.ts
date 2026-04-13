type ApiEnvelope<T> = {
  code?: string
  message?: string
  data: T
}

type GenderItem = {
  id: string
  name: string
}

type PrefixItem = {
  id: string
  genderId: string
  name: string
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

type CheckPhonePayload = {
  phone: string
}

type CheckPhoneResponse = {
  phone: string
  isDuplicate: boolean
}

type AuthTokensResponse = {
  tokenType: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
  refreshTokenExpiresIn: number
  member: {
    id: string
    firstName: string
    lastName: string
    role: 'admin' | 'customer'
  }
}

export const useAdminAuthApi = () => {
  const config = useRuntimeConfig()

  const apiFetch = <T>(url: string, options?: Parameters<typeof $fetch<T>>[1]) => {
    return $fetch<T>(url, {
      baseURL: config.public.apiBase,
      ...options,
    })
  }

  const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})

  const pickString = (source: unknown, camel: string, snake: string) => {
    const data = asRecord(source)
    const camelValue = data[camel]
    if (typeof camelValue === 'string' && camelValue.trim()) return camelValue
    const snakeValue = data[snake]
    if (typeof snakeValue === 'string' && snakeValue.trim()) return snakeValue
    return ''
  }

  const pickNumber = (source: unknown, camel: string, snake: string, fallback = 0) => {
    const data = asRecord(source)
    const raw = data[camel] ?? data[snake]
    const num = Number(raw)
    return Number.isFinite(num) ? num : fallback
  }

  const pickBoolean = (source: unknown, camel: string, snake: string, fallback = false) => {
    const data = asRecord(source)
    const raw = data[camel] ?? data[snake]
    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'string') {
      if (raw.toLowerCase() === 'true') return true
      if (raw.toLowerCase() === 'false') return false
    }
    return fallback
  }

  const normalizeAuthTokens = (data: unknown): AuthTokensResponse => {
    const d = asRecord(data)
    const memberRaw = asRecord(d.member)

    return {
      tokenType: pickString(d, 'tokenType', 'token_type') || 'Bearer',
      accessToken: pickString(d, 'accessToken', 'access_token'),
      refreshToken: pickString(d, 'refreshToken', 'refresh_token'),
      accessTokenExpiresIn: pickNumber(d, 'accessTokenExpiresIn', 'access_token_expires_in', 0),
      refreshTokenExpiresIn: pickNumber(d, 'refreshTokenExpiresIn', 'refresh_token_expires_in', 0),
      member: {
        id: pickString(memberRaw, 'id', 'id'),
        firstName: pickString(memberRaw, 'firstName', 'first_name'),
        lastName: pickString(memberRaw, 'lastName', 'last_name'),
        role: (pickString(memberRaw, 'role', 'role') as 'admin' | 'customer') || 'customer',
      },
    }
  }

  const getGenders = async () => {
    const res = await apiFetch<ApiEnvelope<GenderItem[]>>('/api/v1/systems/genders')
    return res.data || []
  }

  const getPrefixesByGenderId = async (genderId: string) => {
    const res = await apiFetch<ApiEnvelope<PrefixItem[]>>(`/api/v1/systems/prefixes/gender/${genderId}`)
    return res.data || []
  }

  const login = async (payload: LoginPayload) => {
    const res = await apiFetch<ApiEnvelope<AuthTokensResponse>>('/api/v1/auth/login', {
      method: 'POST',
      body: payload,
    })
    return normalizeAuthTokens(res.data)
  }

  const register = async (payload: RegisterPayload) => {
    const res = await apiFetch<ApiEnvelope<AuthTokensResponse>>('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    })
    return normalizeAuthTokens(res.data)
  }

  const registerAdmin = async (payload: RegisterPayload) => {
    const res = await apiFetch<ApiEnvelope<AuthTokensResponse>>('/api/v1/auth/register-admin', {
      method: 'POST',
      body: payload,
    })
    return normalizeAuthTokens(res.data)
  }

  const checkPhoneDuplicate = async (payload: CheckPhonePayload) => {
    const res = await apiFetch<ApiEnvelope<CheckPhoneResponse>>('/api/v1/auth/check-phone', {
      method: 'POST',
      body: payload,
    })
    return pickBoolean(res.data, 'isDuplicate', 'is_duplicate', false)
  }

  return {
    getGenders,
    getPrefixesByGenderId,
    login,
    register,
    registerAdmin,
    checkPhoneDuplicate,
  }
}
