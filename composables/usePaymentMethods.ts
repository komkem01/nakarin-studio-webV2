type PaymentMethod = {
  id: string
  channel: 'bank' | 'promptpay' | 'qr_code' | 'other'
  bankName?: string
  accountName: string
  accountNumber?: string
  promptPayId?: string
  qrCodeUrl?: string
}

type PaymentCheckoutSetting = {
  allowDeposit: boolean
  allowFullPayment: boolean
  defaultPayment: 'deposit' | 'paid'
}

const asRecord = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {})

const toStringOrEmpty = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

const pickStr = (src: Record<string, unknown>, camel: string, snake: string) =>
  toStringOrEmpty(src[camel]) || toStringOrEmpty(src[snake])

const normalizeMethod = (src: unknown, idx: number): PaymentMethod | null => {
  const d = asRecord(src)
  const channelRaw = toStringOrEmpty(d.channel).toLowerCase()
  const channel: PaymentMethod['channel'] = channelRaw === 'promptpay' || channelRaw === 'qr_code' || channelRaw === 'other'
    ? channelRaw
    : 'bank'

  const id = toStringOrEmpty(d.id) || `payment-method-${idx + 1}`
  const bankName = pickStr(d, 'bankName', 'bank_name')
  const accountName = pickStr(d, 'accountName', 'account_name')
  const accountNumber = pickStr(d, 'accountNumber', 'account_number')
  const promptPayId = pickStr(d, 'promptPayId', 'prompt_pay_id') || pickStr(d, 'promptPayId', 'promptpay_id')
  const qrCodeUrl = pickStr(d, 'qrCodeUrl', 'qr_code_url')

  if (!accountName) return null
  if (channel === 'bank' && !accountNumber) return null
  if (channel === 'promptpay' && !promptPayId) return null

  return {
    id,
    channel,
    bankName: bankName || undefined,
    accountName,
    accountNumber: accountNumber || undefined,
    promptPayId: promptPayId || undefined,
    qrCodeUrl: qrCodeUrl || undefined,
  }
}

export const usePaymentMethods = () => {
  const config = useRuntimeConfig()
  const { data, pending, error, refresh } = useAsyncData('payment-methods-public', async () => {
    const response = await $fetch<{ data?: unknown[] }>('/api/v1/payment-methods', {
      baseURL: String(config.public.apiBase || ''),
    })
    const rows = Array.isArray(response?.data) ? response.data : []
    return rows
      .map((item, idx) => normalizeMethod(item, idx))
      .filter((item): item is PaymentMethod => Boolean(item))
  }, {
    default: () => [] as PaymentMethod[],
  })

  const { data: checkoutSettingData, pending: checkoutSettingPending, error: checkoutSettingError, refresh: refreshCheckoutSetting } = useAsyncData('payment-checkout-setting-public', async () => {
    const response = await $fetch<{ data?: unknown }>('/api/v1/payment-methods/settings', {
      baseURL: String(config.public.apiBase || ''),
    })
    const src = asRecord(response?.data)
    return {
      allowDeposit: Boolean(src.allowDeposit ?? src.allow_deposit ?? true),
      allowFullPayment: Boolean(src.allowFullPayment ?? src.allow_full_payment ?? true),
      defaultPayment: String(src.defaultPayment ?? src.default_payment ?? 'deposit').toLowerCase() === 'paid' ? 'paid' : 'deposit',
    } as PaymentCheckoutSetting
  }, {
    default: () => ({ allowDeposit: true, allowFullPayment: true, defaultPayment: 'deposit' }) as PaymentCheckoutSetting,
  })

  const paymentMethods = computed<PaymentMethod[]>(() => Array.isArray(data.value) ? data.value : [])
  const paymentCheckoutSetting = computed<PaymentCheckoutSetting>(() => checkoutSettingData.value || { allowDeposit: true, allowFullPayment: true, defaultPayment: 'deposit' })

  if (import.meta.client) {
    onMounted(() => {
      refresh()
      refreshCheckoutSetting()
    })
  }

  return {
    paymentMethods,
    pending,
    error,
    refresh,
    paymentCheckoutSetting,
    checkoutSettingPending,
    checkoutSettingError,
    refreshCheckoutSetting,
  }
}
