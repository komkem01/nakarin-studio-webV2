type ApiEnvelope<T> = {
  data?: T
}

export type PaymentMethodChannel = 'bank' | 'promptpay' | 'qr_code' | 'other'

export type AdminPaymentMethod = {
  id: string
  channel: PaymentMethodChannel
  bankName?: string | null
  accountName: string
  accountNumber?: string | null
  promptPayId?: string | null
  qrCodeUrl?: string | null
  sortOrder: number
  isActive: boolean
}

export type PaymentCheckoutSetting = {
  allowDeposit: boolean
  allowFullPayment: boolean
  defaultPayment: 'deposit' | 'paid'
}

const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})

const pickString = (source: unknown, camel: string, snake: string, fallback = '') => {
  const d = asRecord(source)
  const a = d[camel]
  if (typeof a === 'string') return a
  const b = d[snake]
  if (typeof b === 'string') return b
  return fallback
}

const pickNumber = (source: unknown, camel: string, snake: string, fallback = 0) => {
  const d = asRecord(source)
  const value = Number(d[camel] ?? d[snake])
  return Number.isFinite(value) ? value : fallback
}

const pickBoolean = (source: unknown, camel: string, snake: string, fallback = false) => {
  const d = asRecord(source)
  const raw = d[camel] ?? d[snake]
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    if (raw.toLowerCase() === 'true') return true
    if (raw.toLowerCase() === 'false') return false
  }
  return fallback
}

const pickNullableString = (source: unknown, camel: string, snake: string) => {
  const value = pickString(source, camel, snake, '').trim()
  return value || null
}

const normalize = (source: unknown): AdminPaymentMethod => {
  const channelRaw = pickString(source, 'channel', 'channel', 'bank').toLowerCase()
  const channel: PaymentMethodChannel = channelRaw === 'promptpay' || channelRaw === 'qr_code' || channelRaw === 'other'
    ? channelRaw
    : 'bank'
  return {
    id: pickString(source, 'id', 'id'),
    channel,
    bankName: pickNullableString(source, 'bankName', 'bank_name'),
    accountName: pickString(source, 'accountName', 'account_name'),
    accountNumber: pickNullableString(source, 'accountNumber', 'account_number'),
    promptPayId: pickNullableString(source, 'promptPayId', 'promptpay_id'),
    qrCodeUrl: pickNullableString(source, 'qrCodeUrl', 'qr_code_url'),
    sortOrder: pickNumber(source, 'sortOrder', 'sort_order', 0),
    isActive: pickBoolean(source, 'isActive', 'is_active', true),
  }
}

export const useAdminPaymentMethodApi = () => {
  const { authFetch } = useAdminSession()

  const normalizeCheckoutSetting = (source: unknown): PaymentCheckoutSetting => ({
    allowDeposit: pickBoolean(source, 'allowDeposit', 'allow_deposit', true),
    allowFullPayment: pickBoolean(source, 'allowFullPayment', 'allow_full_payment', true),
    defaultPayment: pickString(source, 'defaultPayment', 'default_payment', 'deposit') === 'paid' ? 'paid' : 'deposit',
  })

  const listPaymentMethods = async () => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/payment-methods/admin')
    const rows = Array.isArray(res?.data) ? res.data : []
    return rows.map(normalize)
  }

  const createPaymentMethod = async (payload: {
    channel: PaymentMethodChannel
    bankName?: string | null
    accountName: string
    accountNumber?: string | null
    promptPayId?: string | null
    qrCodeUrl?: string | null
    sortOrder: number
    isActive: boolean
  }) => {
    const body = {
      channel: payload.channel,
      bankName: payload.bankName || null,
      accountName: payload.accountName,
      accountNumber: payload.accountNumber || null,
      promptPayId: payload.promptPayId || null,
      qrCodeUrl: payload.qrCodeUrl || null,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    }
    const res = await authFetch<ApiEnvelope<unknown>>('/api/v1/payment-methods', {
      method: 'POST',
      body,
    })
    return normalize(res?.data)
  }

  const updatePaymentMethod = async (id: string, payload: {
    channel: PaymentMethodChannel
    bankName?: string | null
    accountName: string
    accountNumber?: string | null
    promptPayId?: string | null
    qrCodeUrl?: string | null
    sortOrder: number
    isActive: boolean
  }) => {
    const body = {
      channel: payload.channel,
      bankName: payload.bankName || null,
      accountName: payload.accountName,
      accountNumber: payload.accountNumber || null,
      promptPayId: payload.promptPayId || null,
      qrCodeUrl: payload.qrCodeUrl || null,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    }
    const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/payment-methods/${id}`, {
      method: 'PATCH',
      body,
    })
    return normalize(res?.data)
  }

  const deletePaymentMethod = async (id: string) => {
    await authFetch(`/api/v1/payment-methods/${id}`, { method: 'DELETE' })
  }

  const getCheckoutSetting = async () => {
    const res = await authFetch<ApiEnvelope<unknown>>('/api/v1/payment-methods/settings')
    return normalizeCheckoutSetting(res?.data)
  }

  const updateCheckoutSetting = async (payload: PaymentCheckoutSetting) => {
    const res = await authFetch<ApiEnvelope<unknown>>('/api/v1/payment-methods/settings', {
      method: 'PUT',
      body: {
        allowDeposit: payload.allowDeposit,
        allowFullPayment: payload.allowFullPayment,
        defaultPayment: payload.defaultPayment,
      },
    })
    return normalizeCheckoutSetting(res?.data)
  }

  return {
    listPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    getCheckoutSetting,
    updateCheckoutSetting,
  }
}
