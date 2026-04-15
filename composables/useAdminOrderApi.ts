export type BookingStatus =
  | 'draft'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'delivered'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'canceled'

export type PaymentType = 'deposit' | 'paid'

export type BookingDetailRow = {
  id: string
  bookingId: string
  itemName: string
  isAddon: boolean
  option: string | null
  material: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  note: string | null
}

export type BookingMessageRow = {
  id: string
  bookingId: string
  senderType: 'customer' | 'admin' | 'system'
  senderMemberId: string | null
  message: string
  createdAt: string
}

export type BookingAttachmentRow = {
  id: string
  bookingId: string
  attachmentType: string
  paymentMethodId: string | null
  paymentMethodChannel: string | null
  paymentMethodBankName: string | null
  paymentAmount: number | null
  fileName: string
  fileUrl: string
  mimeType: string | null
  fileSize: number | null
  isVerified: boolean
}

export type BookingRow = {
  id: string
  bookingNo: string
  status: BookingStatus
  payment: PaymentType
  packageName: string | null
  baiseeStyle: string | null
  memberId: string | null
  memberAddressId: string | null
  recipientName: string | null
  recipientPhone: string | null
  deliveryNo: string | null
  deliveryVillage: string | null
  deliveryStreet: string | null
  deliveryProvinceId: string | null
  deliveryDistrictId: string | null
  deliverySubDistrictId: string | null
  deliveryZipcodeId: string | null
  eventDate: string | null
  scheduledAt: string | null
  deliveryAt: string | null
  basePrice: number
  addonPrice: number
  totalPrice: number
  depositAmount: number
  paidAmount: number
  balanceAmount: number
  refundAmount: number | null
  refundedAt: string | null
  statusUpdatedAt: string
}

type BookingListResponse = {
  items: BookingRow[]
  meta: {
    page: number
    size: number
    total: number
    totalPages: number
  }
}

type ApiEnvelope<T> = { data?: T }

const asRecord = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {})

const pickString = (src: unknown, key: string, fallback = '') => {
  const d = asRecord(src)
  const v = d[key]
  return typeof v === 'string' ? v : fallback
}

const pickNumber = (src: unknown, key: string, fallback = 0) => {
  const d = asRecord(src)
  const v = Number(d[key])
  return Number.isFinite(v) ? v : fallback
}

const pickNullableString = (src: unknown, key: string): string | null => {
  const d = asRecord(src)
  const v = d[key]
  if (typeof v === 'string' && v.trim()) return v
  return null
}

const normalizeBooking = (src: unknown): BookingRow => ({
  id: pickString(src, 'id'),
  bookingNo: pickString(src, 'booking_no'),
  status: pickString(src, 'status', 'draft') as BookingStatus,
  payment: pickString(src, 'payment', 'deposit') as PaymentType,
  packageName: pickNullableString(src, 'package_name'),
  baiseeStyle: pickNullableString(src, 'baisee_style'),
  memberId: pickNullableString(src, 'member_id'),
  memberAddressId: pickNullableString(src, 'member_address_id'),
  recipientName: pickNullableString(src, 'recipient_name'),
  recipientPhone: pickNullableString(src, 'recipient_phone'),
  deliveryNo: pickNullableString(src, 'delivery_no'),
  deliveryVillage: pickNullableString(src, 'delivery_village'),
  deliveryStreet: pickNullableString(src, 'delivery_street'),
  deliveryProvinceId: pickNullableString(src, 'delivery_province_id'),
  deliveryDistrictId: pickNullableString(src, 'delivery_district_id'),
  deliverySubDistrictId: pickNullableString(src, 'delivery_sub_district_id'),
  deliveryZipcodeId: pickNullableString(src, 'delivery_zipcode_id'),
  eventDate: pickNullableString(src, 'event_date'),
  scheduledAt: pickNullableString(src, 'scheduled_at'),
  deliveryAt: pickNullableString(src, 'delivery_at'),
  basePrice: pickNumber(src, 'base_price'),
  addonPrice: pickNumber(src, 'addon_price'),
  totalPrice: pickNumber(src, 'total_price'),
  depositAmount: pickNumber(src, 'deposit_amount'),
  paidAmount: pickNumber(src, 'paid_amount'),
  balanceAmount: pickNumber(src, 'balance_amount'),
  refundAmount: Number.isFinite(Number(asRecord(src)['refund_amount'] ?? asRecord(src)['refundAmount']))
    ? Number(asRecord(src)['refund_amount'] ?? asRecord(src)['refundAmount'])
    : null,
  refundedAt: pickNullableString(src, 'refunded_at') ?? pickNullableString(src, 'refundedAt'),
  statusUpdatedAt: pickString(src, 'status_updated_at'),
})

const normalizeDetail = (src: unknown): BookingDetailRow => ({
  id: pickString(src, 'id'),
  bookingId: pickString(src, 'booking_id'),
  itemName: pickString(src, 'item_name'),
  isAddon: Boolean(asRecord(src)['is_addon'] ?? asRecord(src)['isAddon']),
  option: pickNullableString(src, 'option'),
  material: pickNullableString(src, 'material'),
  quantity: pickNumber(src, 'quantity'),
  unitPrice: pickNumber(src, 'unit_price'),
  subtotal: pickNumber(src, 'subtotal'),
  note: pickNullableString(src, 'note'),
})

const normalizeMessage = (src: unknown): BookingMessageRow => ({
  id: pickString(src, 'id'),
  bookingId: pickString(src, 'booking_id'),
  senderType: pickString(src, 'sender_type', 'admin') as BookingMessageRow['senderType'],
  senderMemberId: pickNullableString(src, 'sender_member_id'),
  message: pickString(src, 'message'),
  createdAt: pickString(src, 'created_at'),
})

const normalizeAttachment = (src: unknown): BookingAttachmentRow => {
  const d = asRecord(src)
  const fs = Number(d['fileSize'] ?? d['file_size'])
  const pick = (camel: string, snake: string) => {
    const value = d[camel] ?? d[snake]
    return typeof value === 'string' ? value : ''
  }
  const pickNullable = (camel: string, snake: string) => {
    const value = pick(camel, snake).trim()
    return value || null
  }
  return {
    id: pick('id', 'id'),
    bookingId: pick('bookingId', 'booking_id'),
    attachmentType: pick('attachmentType', 'attachment_type'),
    paymentMethodId: pickNullable('paymentMethodId', 'payment_method_id'),
    paymentMethodChannel: pickNullable('paymentMethodChannel', 'payment_method_channel'),
    paymentMethodBankName: pickNullable('paymentMethodBankName', 'payment_method_bank_name'),
    paymentAmount: Number.isFinite(Number(d['paymentAmount'] ?? d['payment_amount'])) ? Number(d['paymentAmount'] ?? d['payment_amount']) : null,
    fileName: pick('fileName', 'file_name'),
    fileUrl: pick('fileUrl', 'file_url'),
    mimeType: pickNullable('mimeType', 'mime_type'),
    fileSize: Number.isFinite(fs) ? fs : null,
    isVerified: Boolean(d['isVerified'] ?? d['is_verified']),
  }
}

export const useAdminOrderApi = () => {
  const { authFetch } = useAdminSession()

  const listBookings = async (query?: {
    page?: number
    size?: number
    status?: string
    payment?: string
    q?: string
  }) => {
    const res = await authFetch<ApiEnvelope<BookingListResponse>>('/api/v1/bookings', {
      query: {
        page: query?.page || 1,
        size: query?.size || 15,
        status: query?.status || undefined,
        payment: query?.payment || undefined,
        q: query?.q || undefined,
      },
    })
    const data = asRecord(res?.data)
    const itemsRaw = Array.isArray(data.items) ? data.items : []
    const meta = asRecord(data.meta)
    return {
      items: itemsRaw.map(normalizeBooking),
      meta: {
        page: pickNumber(meta, 'page', 1),
        size: pickNumber(meta, 'size', 15),
        total: pickNumber(meta, 'total', 0),
        totalPages: pickNumber(meta, 'total_pages', 0),
      },
    }
  }

  const getBooking = async (id: string) => {
    const res = await authFetch<ApiEnvelope<BookingRow>>(`/api/v1/bookings/${id}`)
    return normalizeBooking(res?.data)
  }

  const updateBooking = async (id: string, payload: {
    bookingNo: string
    status: BookingStatus
    payment: PaymentType
    packageName?: string | null
    baiseeStyle?: string | null
    memberId?: string | null
    memberAddressId?: string | null
    recipientName?: string | null
    recipientPhone?: string | null
    deliveryNo?: string | null
    deliveryVillage?: string | null
    deliveryStreet?: string | null
    deliveryProvinceId?: string | null
    deliveryDistrictId?: string | null
    deliverySubDistrictId?: string | null
    deliveryZipcodeId?: string | null
    eventDate?: string | null
    scheduledAt?: string | null
    deliveryAt?: string | null
    basePrice: number
    addonPrice: number
    depositAmount: number
    paidAmount: number
  }) => {
    const res = await authFetch<ApiEnvelope<BookingRow>>(`/api/v1/bookings/${id}`, {
      method: 'PATCH',
      body: payload,
    })
    return normalizeBooking(res?.data)
  }

  const decideBookingCancelRequest = async (id: string, payload: {
    approve: boolean
    reason?: string
  }) => {
    const res = await authFetch<ApiEnvelope<BookingRow>>(`/api/v1/bookings/${id}/cancel-decision`, {
      method: 'POST',
      body: payload,
    })
    return normalizeBooking(res?.data)
  }

  // ─── Booking Details ────────────────────────────────────────────────────────

  const listBookingDetails = async (bookingId: string) => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/booking-details', { query: { bookingId } })
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeDetail)
  }

  const createBookingDetail = async (payload: {
    bookingId: string
    itemName: string
    isAddon?: boolean
    option?: string | null
    material?: string | null
    quantity: number
    unitPrice: number
    note?: string | null
  }) => {
    const res = await authFetch<ApiEnvelope<unknown>>('/api/v1/booking-details', { method: 'POST', body: payload })
    return normalizeDetail(res?.data)
  }

  const updateBookingDetail = async (id: string, payload: {
    bookingId: string
    itemName: string
    isAddon?: boolean
    option?: string | null
    material?: string | null
    quantity: number
    unitPrice: number
    note?: string | null
  }) => {
    const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/booking-details/${id}`, { method: 'PATCH', body: payload })
    return normalizeDetail(res?.data)
  }

  const deleteBookingDetail = async (id: string) => {
    await authFetch(`/api/v1/booking-details/${id}`, { method: 'DELETE' })
  }

  // ─── Booking Messages ───────────────────────────────────────────────────────

  const listBookingMessages = async (bookingId: string) => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/booking-messages', { query: { bookingId } })
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeMessage)
  }

  const createBookingMessage = async (payload: {
    bookingId: string
    senderType: string
    message: string
  }) => {
    const res = await authFetch<ApiEnvelope<unknown>>('/api/v1/booking-messages', { method: 'POST', body: payload })
    return normalizeMessage(res?.data)
  }

  // ─── Booking Attachments ────────────────────────────────────────────────────

  const listBookingAttachments = async (bookingId: string) => {
    const res = await authFetch<ApiEnvelope<unknown[]>>('/api/v1/booking-attachments', { query: { bookingId } })
    return (Array.isArray(res?.data) ? res.data : []).map(normalizeAttachment)
  }

  const deleteBookingAttachment = async (id: string) => {
    await authFetch(`/api/v1/booking-attachments/${id}`, { method: 'DELETE' })
  }

  const verifyBookingAttachment = async (id: string, confirmedAmount?: number) => {
    const body = typeof confirmedAmount === 'number' && Number.isFinite(confirmedAmount)
      ? { confirmedAmount }
      : undefined
    const res = await authFetch<ApiEnvelope<unknown>>(`/api/v1/booking-attachments/${id}/verify`, { method: 'PATCH', body })
    return normalizeAttachment(res?.data)
  }

  return {
    listBookings, getBooking, updateBooking,
    decideBookingCancelRequest,
    listBookingDetails, createBookingDetail, updateBookingDetail, deleteBookingDetail,
    listBookingMessages, createBookingMessage,
    listBookingAttachments, deleteBookingAttachment, verifyBookingAttachment,
  }
}
