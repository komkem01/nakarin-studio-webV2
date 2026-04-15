<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'รายละเอียดคำสั่งซื้อ - Nakarin Studio' })

const route = useRoute()
const { getSession, authFetch } = useCustomerAuth()
const { paymentMethods, pending: paymentMethodsPending, error: paymentMethodsError } = usePaymentMethods()
const toast = useAppToast()

const paymentChannelLabel = (channel: string, bankName?: string) => {
  if (channel === 'promptpay') return 'พร้อมเพย์'
  if (channel === 'qr_code') return 'QR Code'
  if (channel === 'other') return 'ช่องทางอื่นๆ'
  return bankName || 'บัญชีธนาคาร'
}

const paymentModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const uploadSlipModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const cancelRequestModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const cancelRequestConfirmModalRef = ref<InstanceType<typeof BaseModal> | null>(null)

const session = ref(getSession())
const member = computed(() => session.value?.member)

onMounted(() => {
  session.value = getSession()
  if (!session.value) navigateTo(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
})

type BookingDetail = {
  id: string
  bookingNo: string
  status: string
  payment: string
  packageName: string | null
  baiseeStyle: string | null
  recipientName: string
  recipientPhone: string
  deliveryNo: string | null
  deliveryVillage: string | null
  deliveryStreet: string | null
  deliveryProvinceId: string | null
  deliveryDistrictId: string | null
  deliverySubDistrictId: string | null
  deliveryZipcodeId: string | null
  deliveryProvince: string | null
  deliveryDistrict: string | null
  deliverySubDistrict: string | null
  deliveryZipcode: string | null
  eventDate: string | null
  basePrice: number
  addonPrice: number
  totalPrice: number
  depositAmount: number
  paidAmount: number
  balanceAmount: number
  statusUpdatedAt: string
}

const asRecord = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const pickStr = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v) return v
  }
  return ''
}
const pickNum = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = Number(o[k])
    if (Number.isFinite(v)) return v
  }
  return 0
}
const pickNullable = (o: Record<string, unknown>, key: string): string | null => {
  const v = o[key]
  return typeof v === 'string' && v.trim() ? v : null
}

const normalizeBooking = (src: unknown): BookingDetail => {
  const d = asRecord(src)
  return {
    id: pickStr(d, 'id'),
    bookingNo: pickStr(d, 'booking_no'),
    status: pickStr(d, 'status', 'draft') || 'draft',
    payment: pickStr(d, 'payment'),
    packageName: pickNullable(d, 'package_name'),
    baiseeStyle: pickNullable(d, 'baisee_style'),
    recipientName: pickStr(d, 'recipient_name'),
    recipientPhone: pickStr(d, 'recipient_phone'),
    deliveryNo: pickNullable(d, 'delivery_no'),
    deliveryVillage: pickNullable(d, 'delivery_village'),
    deliveryStreet: pickNullable(d, 'delivery_street'),
    deliveryProvinceId: pickNullable(d, 'delivery_province_id'),
    deliveryDistrictId: pickNullable(d, 'delivery_district_id'),
    deliverySubDistrictId: pickNullable(d, 'delivery_sub_district_id'),
    deliveryZipcodeId: pickNullable(d, 'delivery_zipcode_id'),
    deliveryProvince: pickNullable(d, 'delivery_province') || pickNullable(d, 'delivery_province_name') || pickNullable(d, 'province_name'),
    deliveryDistrict: pickNullable(d, 'delivery_district') || pickNullable(d, 'delivery_district_name') || pickNullable(d, 'district_name'),
    deliverySubDistrict: pickNullable(d, 'delivery_sub_district') || pickNullable(d, 'delivery_sub_district_name') || pickNullable(d, 'sub_district_name'),
    deliveryZipcode: pickNullable(d, 'delivery_zipcode') || pickNullable(d, 'delivery_zipcode_code') || pickNullable(d, 'zipcode_code'),
    eventDate: pickNullable(d, 'event_date'),
    basePrice: pickNum(d, 'base_price'),
    addonPrice: pickNum(d, 'addon_price'),
    totalPrice: pickNum(d, 'total_price'),
    depositAmount: pickNum(d, 'deposit_amount'),
    paidAmount: pickNum(d, 'paid_amount'),
    balanceAmount: pickNum(d, 'balance_amount'),
    statusUpdatedAt: pickStr(d, 'status_updated_at'),
  }
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'รอดำเนินการ',
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  processing: 'กำลังดำเนินการ',
  in_production: 'กำลังผลิต',
  ready: 'พร้อมส่ง',
  delivered: 'จัดส่งแล้ว',
  completed: 'เสร็จสิ้น',
  canceled: 'ยกเลิก',
  cancelled: 'ยกเลิก',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  in_production: 'bg-blue-50 text-blue-700 border-blue-200',
  ready: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
  completed: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
  canceled: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

type BookingAttachment = {
  id: string
  attachmentType: string
  paymentMethodId: string | null
  paymentAmount: number | null
  fileName: string
  fileUrl: string
  mimeType: string | null
  fileSize: number | null
  isVerified: boolean
}

type BookingLineItem = {
  id: string
  itemName: string
  isAddon: boolean
  option: string | null
  material: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  note: string | null
}

type BookingMessage = {
  id: string
  bookingId: string
  senderType: 'customer' | 'admin' | 'system'
  senderMemberId: string | null
  message: string
  createdAt: string
}

const booking = ref<BookingDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const loadingAttachments = ref(false)
const attachments = ref<BookingAttachment[]>([])
const loadingDetails = ref(false)
const details = ref<BookingLineItem[]>([])
const messages = ref<BookingMessage[]>([])
const loadingMessages = ref(false)
const sendingMessage = ref(false)
const messageInput = ref('')
const messageThreadRef = ref<HTMLElement | null>(null)
const isTypingMessage = ref(false)
const uploadingSlip = ref(false)
const deletingAttachmentId = ref('')
const requestingCancel = ref(false)
const cancelReasonInput = ref('')
const slipFile = ref<File | null>(null)
const slipAmount = ref<number | null>(null)
const selectedSlipPaymentMethodId = ref('')
const slipInputRef = ref<HTMLInputElement | null>(null)
let messageRefreshTimer: ReturnType<typeof setInterval> | null = null
let messageTypingIdleTimer: ReturnType<typeof setTimeout> | null = null

const resolvedAddress = reactive({
  province: '',
  district: '',
  subDistrict: '',
  zipcode: '',
})

const addressCache = {
  province: new Map<string, string>(),
  district: new Map<string, string>(),
  subDistrict: new Map<string, string>(),
  zipcode: new Map<string, string>(),
}

const statusLabel = (s: string) => STATUS_LABEL[s] || s
const statusColor = (s: string) => STATUS_COLOR[s] || 'bg-neutral-100 text-neutral-500 border-neutral-200'

const cancelRequestSystemPrefix = 'คำขอยกเลิกจากลูกค้า (รออนุมัติ):'
const cancelApprovedSystemPrefix = 'คำขอยกเลิกถูกอนุมัติโดยแอดมิน'
const cancelRejectedSystemPrefix = 'คำขอยกเลิกถูกปฏิเสธโดยแอดมิน:'

const currency = (v: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v)

const formatDate = (iso: string | null) => {
  if (!iso) return '-'
  try {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const formatDateTime = (iso: string) => {
  if (!iso) return '-'
  try {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const isOpaqueId = (value: string | null) => {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v)
}

const normalizeAddressLabel = (value: string | null, fallback: string) => {
  if (!value) return fallback
  return isOpaqueId(value) ? fallback : value
}

const pickAddressLabel = (src: unknown) => {
  const r = asRecord(src)
  return pickStr(r, 'name', 'code', 'zipcode', 'postal_code')
}

const resolveAddressItem = async (
  id: string | null,
  endpoint: string,
  cache: Map<string, string>,
) => {
  if (!id) return ''
  if (cache.has(id)) return cache.get(id) || ''

  try {
    const res = await authFetch<any>(`${endpoint}/${id}`)
    const label = pickAddressLabel(res?.data ?? res)
    if (label) cache.set(id, label)
    return label
  } catch {
    return ''
  }
}

const resolveDeliveryAddressNames = async () => {
  if (!booking.value) {
    resolvedAddress.province = ''
    resolvedAddress.district = ''
    resolvedAddress.subDistrict = ''
    resolvedAddress.zipcode = ''
    return
  }

  const [province, district, subDistrict, zipcode] = await Promise.all([
    resolveAddressItem(booking.value.deliveryProvinceId, '/api/v1/systems/provinces', addressCache.province),
    resolveAddressItem(booking.value.deliveryDistrictId, '/api/v1/systems/districts', addressCache.district),
    resolveAddressItem(booking.value.deliverySubDistrictId, '/api/v1/systems/subdistricts', addressCache.subDistrict),
    resolveAddressItem(booking.value.deliveryZipcodeId, '/api/v1/systems/zipcodes', addressCache.zipcode),
  ])

  resolvedAddress.province = province
  resolvedAddress.district = district
  resolvedAddress.subDistrict = subDistrict
  resolvedAddress.zipcode = zipcode
}

const deliveryAddress = computed(() => {
  if (!booking.value) return '-'
  const b = booking.value

  const areaParts = [
    normalizeAddressLabel(b.deliverySubDistrict, resolvedAddress.subDistrict),
    normalizeAddressLabel(b.deliveryDistrict, resolvedAddress.district),
    normalizeAddressLabel(b.deliveryProvince, resolvedAddress.province),
    normalizeAddressLabel(b.deliveryZipcode, resolvedAddress.zipcode),
  ].filter(Boolean) as string[]

  return [
    b.deliveryNo,
    b.deliveryVillage,
    b.deliveryStreet,
    ...areaParts,
  ].filter(Boolean).join(' ') || '-'
})

const paymentAmount = computed(() => {
  if (!booking.value) return 0
  if (booking.value.payment === 'deposit' && booking.value.paidAmount <= 0) return booking.value.depositAmount
  return Math.max(0, booking.value.balanceAmount)
})

const paymentPlanLabel = computed(() => {
  if (!booking.value) return '-'
  return booking.value.payment === 'paid' ? 'ชำระเต็มจำนวน' : 'ชำระมัดจำ 50%'
})

const outstandingAmount = computed(() => Math.max(0, booking.value?.balanceAmount || 0))
const paidAmountValue = computed(() => Math.max(0, booking.value?.paidAmount || 0))
const paymentProgressPercent = computed(() => {
  const total = Math.max(0, booking.value?.totalPrice || 0)
  if (total <= 0) return 0
  const percent = Math.round((paidAmountValue.value / total) * 100)
  return Math.max(0, Math.min(100, percent))
})
const paymentProgressLabel = computed(() => outstandingAmount.value > 0 ? 'รอชำระเพิ่ม' : 'ชำระครบแล้ว')

const paymentActionLabel = computed(() => outstandingAmount.value > 0 ? 'ชำระยอดคงเหลือ' : 'ตรวจสอบช่องทางชำระเงิน')

watch(paymentMethods, (methods) => {
  if (!methods.length) {
    selectedSlipPaymentMethodId.value = ''
    return
  }
  if (!methods.some(m => m.id === selectedSlipPaymentMethodId.value)) {
    selectedSlipPaymentMethodId.value = methods[0]?.id || ''
  }
}, { immediate: true })

const selectedSlipPaymentMethod = computed(() =>
  paymentMethods.value.find(m => m.id === selectedSlipPaymentMethodId.value) || null,
)

const paymentMethodLabelById = computed(() => {
  const map: Record<string, string> = {}
  for (const method of paymentMethods.value) {
    map[method.id] = paymentChannelLabel(method.channel, method.bankName)
  }
  return map
})

const paymentChannelTone = (channel: string) => {
  if (channel === 'promptpay') {
    return {
      chip: 'bg-violet-100 text-violet-700 border-violet-200',
      card: 'border-violet-200/70 bg-violet-50/60',
    }
  }
  if (channel === 'qr_code') {
    return {
      chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      card: 'border-emerald-200/70 bg-emerald-50/60',
    }
  }
  if (channel === 'other') {
    return {
      chip: 'bg-slate-200 text-slate-700 border-slate-300',
      card: 'border-slate-200 bg-slate-50/70',
    }
  }
  return {
    chip: 'bg-sky-100 text-sky-700 border-sky-200',
    card: 'border-sky-200/70 bg-sky-50/60',
  }
}

const copyPaymentValue = async (value: string | null | undefined, label: string) => {
  const text = String(value || '').trim()
  if (!text) return
  if (!import.meta.client || !navigator?.clipboard) {
    toast.warning('อุปกรณ์นี้ยังไม่รองรับการคัดลอกอัตโนมัติ')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`คัดลอก${label}แล้ว`)
  } catch {
    toast.error('ไม่สามารถคัดลอกข้อมูลได้')
  }
}

const detailItemsTotal = computed(() =>
  details.value.reduce((sum, item) => sum + item.subtotal, 0),
)

const packageIncludedAmount = computed(() =>
  details.value.reduce((sum, item) => sum + (item.isAddon ? 0 : item.subtotal), 0),
)

const detailAddonTotal = computed(() =>
  details.value.reduce((sum, item) => sum + (item.isAddon ? item.subtotal : 0), 0),
)

const customerNotes = computed(() =>
  Array.from(new Set(details.value.map(item => item.note?.trim()).filter((note): note is string => Boolean(note)))),
)

const orderAddonTotal = computed(() => Math.max(0, booking.value?.addonPrice || 0))
const detailTotalDiff = computed(() => orderAddonTotal.value - detailAddonTotal.value)
const isDetailTotalMatched = computed(() => Math.abs(detailTotalDiff.value) < 0.5)

const normalizeAttachment = (src: unknown): BookingAttachment => {
  const d = asRecord(src)
  return {
    id: pickStr(d, 'id'),
    attachmentType: pickStr(d, 'attachmentType', 'attachment_type'),
    paymentMethodId: pickStr(d, 'paymentMethodId', 'payment_method_id') || null,
    paymentAmount: pickNum(d, 'paymentAmount', 'payment_amount') || null,
    fileName: pickStr(d, 'fileName', 'file_name'),
    fileUrl: pickStr(d, 'fileUrl', 'file_url'),
    mimeType: pickStr(d, 'mimeType', 'mime_type') || null,
    fileSize: pickNum(d, 'fileSize', 'file_size') || null,
    isVerified: Boolean(d.isVerified ?? d.is_verified),
  }
}

const isImageAttachment = (a: BookingAttachment) => {
  const mime = String(a.mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif)$/i.test(a.fileName)
}

const attachmentSizeLabel = (size: number | null) => {
  const n = Number(size || 0)
  if (!Number.isFinite(n) || n <= 0) return '-'
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

const removeAttachment = async (id: string) => {
  if (!id || deletingAttachmentId.value === id) return
  deletingAttachmentId.value = id
  try {
    await authFetch(`/api/v1/booking-attachments/${id}`, { method: 'DELETE' })
    attachments.value = attachments.value.filter(a => a.id !== id)
    toast.success('ลบไฟล์เรียบร้อย')
  } catch {
    toast.error('ไม่สามารถลบไฟล์ได้')
  } finally {
    deletingAttachmentId.value = ''
  }
}

const normalizeDetail = (src: unknown): BookingLineItem => {
  const d = asRecord(src)
  const quantity = Math.max(1, pickNum(d, 'quantity'))
  const unitPrice = Math.max(0, pickNum(d, 'unit_price', 'unitPrice'))
  const subtotalRaw = pickNum(d, 'subtotal')
  const subtotal = subtotalRaw > 0 ? subtotalRaw : quantity * unitPrice
  return {
    id: pickStr(d, 'id'),
    itemName: pickStr(d, 'item_name', 'itemName') || '-',
    isAddon: Boolean(d.is_addon ?? d.isAddon),
    option: pickNullable(d, 'option'),
    material: pickNullable(d, 'material'),
    quantity,
    unitPrice,
    subtotal,
    note: pickNullable(d, 'note'),
  }
}

const normalizeMessage = (src: unknown): BookingMessage => {
  const d = asRecord(src)
  return {
    id: pickStr(d, 'id'),
    bookingId: pickStr(d, 'bookingId', 'booking_id'),
    senderType: (pickStr(d, 'senderType', 'sender_type') || 'system') as BookingMessage['senderType'],
    senderMemberId: pickNullable(d, 'senderMemberId') || pickNullable(d, 'sender_member_id'),
    message: pickStr(d, 'message'),
    createdAt: pickStr(d, 'createdAt', 'created_at'),
  }
}

const scrollMessagesToBottom = () => {
  nextTick(() => {
    const el = messageThreadRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  })
}

const startMessageAutoRefresh = () => {
  if (messageRefreshTimer) clearInterval(messageRefreshTimer)
  messageRefreshTimer = setInterval(() => {
    if (!booking.value?.id || loadingMessages.value || isTypingMessage.value || sendingMessage.value) return
    loadMessages()
  }, 7000)
}

const stopMessageAutoRefresh = () => {
  if (!messageRefreshTimer) return
  clearInterval(messageRefreshTimer)
  messageRefreshTimer = null
}

const markTyping = () => {
  isTypingMessage.value = true
  if (messageTypingIdleTimer) clearTimeout(messageTypingIdleTimer)
  messageTypingIdleTimer = setTimeout(() => {
    isTypingMessage.value = false
    messageTypingIdleTimer = null
  }, 1200)
}

const stopTyping = () => {
  isTypingMessage.value = false
  if (!messageTypingIdleTimer) return
  clearTimeout(messageTypingIdleTimer)
  messageTypingIdleTimer = null
}

const loadAttachments = async () => {
  if (!booking.value?.id) return
  loadingAttachments.value = true
  try {
    const res = await authFetch<any>('/api/v1/booking-attachments', {
      query: { bookingId: booking.value.id },
    })
    const items: unknown[] = Array.isArray(res?.data) ? res.data : []
    attachments.value = items.map(normalizeAttachment).filter(a => a.attachmentType === 'payment_slip')
  } catch {
    attachments.value = []
  } finally {
    loadingAttachments.value = false
  }
}

const loadMessages = async () => {
  if (!booking.value?.id) return
  loadingMessages.value = true
  try {
    const res = await authFetch<any>('/api/v1/booking-messages', {
      query: { bookingId: booking.value.id },
    })
    const items: unknown[] = Array.isArray(res?.data) ? res.data : []
    messages.value = items.map(normalizeMessage)
    scrollMessagesToBottom()
  } catch {
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

const loadDetails = async () => {
  if (!booking.value?.id) return
  loadingDetails.value = true
  try {
    const res = await authFetch<any>('/api/v1/booking-details', {
      query: { bookingId: booking.value.id },
    })
    const items: unknown[] = Array.isArray(res?.data) ? res.data : []
    details.value = items.map(normalizeDetail)
  } catch {
    details.value = []
  } finally {
    loadingDetails.value = false
  }
}

const sendMessage = async () => {
  if (!booking.value?.id) return
  if (!messageInput.value.trim()) return

  sendingMessage.value = true
  try {
    const res = await authFetch<any>('/api/v1/booking-messages', {
      method: 'POST',
      body: {
        bookingId: booking.value.id,
        senderType: 'customer',
        message: messageInput.value.trim(),
      },
    })
    const created = normalizeMessage(res?.data ?? res)
    messages.value.push(created)
    messageInput.value = ''
    scrollMessagesToBottom()
    toast.success('ส่งข้อความเรียบร้อย')
  } catch {
    toast.error('ไม่สามารถส่งข้อความได้')
  } finally {
    sendingMessage.value = false
  }
}

const pendingCancelReason = computed(() => {
  let reason = ''
  let pending = false
  for (const m of messages.value) {
    const text = String(m.message || '').trim()
    if (m.senderType === 'system' && text.startsWith(cancelRequestSystemPrefix)) {
      reason = text.replace(cancelRequestSystemPrefix, '').trim()
      pending = true
      continue
    }
    if (m.senderType === 'system' && (text.startsWith(cancelApprovedSystemPrefix) || text.startsWith(cancelRejectedSystemPrefix))) {
      pending = false
      reason = ''
    }
  }
  return pending ? reason : ''
})

const canRequestCancel = computed(() => {
  const status = String(booking.value?.status || '').toLowerCase()
  if (!booking.value?.id) return false
  if (status === 'canceled' || status === 'cancelled') return false
  return !pendingCancelReason.value
})

const openCancelRequestModal = () => {
  cancelReasonInput.value = ''
  cancelRequestModalRef.value?.open()
}

const submitCancelRequest = async () => {
  if (!booking.value?.id || requestingCancel.value) return
  if (!cancelReasonInput.value.trim()) {
    toast.warning('กรุณาระบุเหตุผลที่ต้องการยกเลิก')
    return
  }

  requestingCancel.value = true
  try {
    await authFetch(`/api/v1/bookings/${booking.value.id}/cancel-request`, {
      method: 'POST',
      body: { reason: cancelReasonInput.value.trim() },
    })
    cancelRequestConfirmModalRef.value?.close()
    cancelRequestModalRef.value?.close()
    cancelReasonInput.value = ''
    await loadMessages()
    toast.success('ส่งคำขอยกเลิกเรียบร้อยแล้ว รอแอดมินอนุมัติ')
  } catch {
    toast.error('ไม่สามารถส่งคำขอยกเลิกได้')
  } finally {
    requestingCancel.value = false
  }
}

const requestSubmitCancelRequest = () => {
  if (!cancelReasonInput.value.trim()) {
    toast.warning('กรุณาระบุเหตุผลที่ต้องการยกเลิก')
    return
  }
  cancelRequestConfirmModalRef.value?.open()
}

const openUploadSlip = () => {
  slipFile.value = null
  slipAmount.value = null
  if (!selectedSlipPaymentMethodId.value && paymentMethods.value.length) {
    selectedSlipPaymentMethodId.value = paymentMethods.value[0]?.id || ''
  }
  uploadSlipModalRef.value?.open()
  nextTick(() => {
    slipInputRef.value?.click()
  })
}

const onSlipFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  slipFile.value = file
}

const submitSlip = async () => {
  if (!booking.value?.id) return
  if (!slipFile.value) {
    toast.warning('กรุณาเลือกไฟล์สลิปก่อน')
    return
  }
  if (!selectedSlipPaymentMethodId.value) {
    toast.warning('กรุณาเลือกช่องทางชำระเงินก่อนอัปโหลดสลิป')
    return
  }
  if (!Number.isFinite(Number(slipAmount.value)) || Number(slipAmount.value) <= 0) {
    toast.warning('กรุณากรอกยอดชำระในสลิปให้ถูกต้อง')
    return
  }

  uploadingSlip.value = true
  try {
    const fd = new FormData()
    fd.append('target', 'payment_slip')
    fd.append('file', slipFile.value)

    const uploadRes = await authFetch<{ data?: { id?: string, url?: string } }>('/api/v1/uploads', {
      method: 'POST',
      body: fd,
    })
    const storageId = String(uploadRes?.data?.id || '').trim()
    const uploadedUrl = String(uploadRes?.data?.url || '').trim()
    if (!storageId || !uploadedUrl) throw new Error('missing-upload-data')

    await authFetch('/api/v1/booking-attachments', {
      method: 'POST',
      body: {
        bookingId: booking.value.id,
        storageId,
        paymentMethodId: selectedSlipPaymentMethodId.value,
        paymentAmount: Number(slipAmount.value),
        attachmentType: 'payment_slip',
      },
    })
    const channelLabel = selectedSlipPaymentMethod.value
      ? paymentChannelLabel(selectedSlipPaymentMethod.value.channel, selectedSlipPaymentMethod.value.bankName)
      : 'ช่องทางที่เลือก'
    toast.success(`อัปโหลดสลิปเรียบร้อย (${channelLabel})`)
    uploadSlipModalRef.value?.close()
    await loadAttachments()
  } catch {
    toast.error('ไม่สามารถอัปโหลดสลิปได้')
  } finally {
    uploadingSlip.value = false
  }
}

const fetchDetail = async () => {
  const id = String(route.params.id || '')
  if (!id) {
    errorMessage.value = 'ไม่พบรหัสคำสั่งซื้อ'
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    // Primary: detail endpoint
    const res = await authFetch<any>(`/api/v1/bookings/${id}`)
    const data = res?.data ?? res
    booking.value = normalizeBooking(data)
  } catch {
    // Fallback: list endpoint then find by id
    try {
      const listRes = await authFetch<any>('/api/v1/bookings', {
        query: { memberId: member.value?.id, size: 100 },
      })
      const items: unknown[] = Array.isArray(listRes?.data?.items) ? listRes.data.items : Array.isArray(listRes?.data) ? listRes.data : []
      const found = items.find((i) => pickStr(asRecord(i), 'id') === id)
      if (!found) throw new Error('not-found')
      booking.value = normalizeBooking(found)
    } catch {
      errorMessage.value = 'ไม่สามารถโหลดรายละเอียดคำสั่งซื้อได้'
      toast.error('ไม่สามารถโหลดรายละเอียดคำสั่งซื้อได้')
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
watch(booking, () => {
  loadAttachments()
  loadDetails()
  resolveDeliveryAddressNames()
  loadMessages()
  if (booking.value?.id) startMessageAutoRefresh()
})

watch(() => messages.value.length, (nextLen, prevLen) => {
  if (nextLen > prevLen) scrollMessagesToBottom()
})

onBeforeUnmount(() => {
  stopMessageAutoRefresh()
  stopTyping()
})
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#f0fdf4_0%,_#ffffff_45%)] py-10">
    <UContainer class="max-w-4xl">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <NuxtLink to="/orders" class="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-[#166534] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" />
          </svg>
          กลับไปหน้าคำสั่งซื้อ
        </NuxtLink>
      </div>

      <div v-if="loading" class="flex justify-center py-16">
        <svg class="animate-spin h-7 w-7 text-[#166534]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
        {{ errorMessage }}
      </div>

      <div v-else-if="booking" class="space-y-4">
        <div class="rounded-2xl border border-[#bbf7d0] bg-white p-5 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)]">
          <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-xl font-bold text-neutral-900">รายละเอียดคำสั่งซื้อ</h1>
                <button
                  v-if="canRequestCancel"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  @click="openCancelRequestModal"
                >
                  ขอยกเลิกคำสั่งซื้อ
                </button>
              </div>
              <p class="text-sm text-neutral-500 mt-1">หมายเลขคำสั่งซื้อ #{{ booking.bookingNo }}</p>
            </div>
            <span class="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border" :class="statusColor(booking.status)">
              {{ statusLabel(booking.status) }}
            </span>
          </div>

          <div v-if="pendingCancelReason" class="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p class="font-semibold">ส่งคำขอยกเลิกแล้ว (รอแอดมินอนุมัติ)</p>
            <p class="mt-1 text-amber-800">เหตุผลที่ส่ง: {{ pendingCancelReason }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-neutral-400">รายการ</p>
              <p class="font-medium text-neutral-900 mt-1">{{ booking.packageName || 'บายศรี' }}</p>
              <p v-if="booking.baiseeStyle" class="text-xs text-neutral-500 mt-1">สไตล์: {{ booking.baiseeStyle }}</p>
            </div>
            <div>
              <p class="text-neutral-400">วันงาน</p>
              <p class="font-medium text-neutral-900 mt-1">{{ formatDateTime(booking.eventDate || '') }}</p>
            </div>
            <div>
              <p class="text-neutral-400">ผู้รับ</p>
              <p class="font-medium text-neutral-900 mt-1">{{ booking.recipientName || '-' }} · {{ booking.recipientPhone || '-' }}</p>
            </div>
            <div>
              <p class="text-neutral-400">อัพเดตล่าสุด</p>
              <p class="font-medium text-neutral-900 mt-1">{{ formatDate(booking.statusUpdatedAt || null) }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-[#bbf7d0] bg-white p-5 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)]">
          <h2 class="text-sm font-semibold text-neutral-700 mb-2">ที่อยู่จัดส่ง</h2>
          <p class="text-sm text-neutral-600">{{ deliveryAddress }}</p>
        </div>

        <div v-if="customerNotes.length > 0" class="rounded-2xl border border-[#bbf7d0] bg-white p-5 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)]">
          <h2 class="text-sm font-semibold text-neutral-700 mb-2">หมายเหตุจากลูกค้า</h2>
          <div class="space-y-1.5 text-sm text-neutral-600">
            <p v-for="(note, idx) in customerNotes" :key="`${note}-${idx}`" class="whitespace-pre-wrap break-words">{{ note }}</p>
          </div>
        </div>

        <div class="rounded-2xl border border-[#bbf7d0] bg-white p-5 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)]">
          <h2 class="text-sm font-semibold text-neutral-700 mb-3">รายการสินค้า</h2>

          <div v-if="loadingDetails" class="text-sm text-neutral-400">กำลังโหลดรายการสินค้า...</div>

          <div v-else-if="details.length === 0" class="text-sm text-neutral-400">
            ไม่พบรายการสินค้าในคำสั่งซื้อนี้
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[560px] text-sm">
              <thead>
                <tr class="border-b border-[#ecfdf3] text-xs text-neutral-500">
                  <th class="py-2 text-left font-medium">รายการ</th>
                  <th class="py-2 text-left font-medium">รายละเอียด</th>
                  <th class="py-2 text-left font-medium">ประเภท</th>
                  <th class="py-2 text-right font-medium">จำนวน</th>
                  <th class="py-2 text-right font-medium">ราคา/ชิ้น</th>
                  <th class="py-2 text-right font-medium">รวม</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in details" :key="item.id || `${item.itemName}-${item.quantity}-${item.unitPrice}`" class="border-b border-[#f0fdf4] last:border-b-0">
                  <td class="py-3 pr-3 font-medium text-neutral-900">{{ item.itemName }}</td>
                  <td class="py-3 pr-3 text-xs text-neutral-500">
                    <div class="space-y-0.5">
                      <p v-if="item.option">ตัวเลือก: {{ item.option }}</p>
                      <p v-if="item.material">วัสดุ: {{ item.material }}</p>
                      <p v-if="item.note">หมายเหตุ: {{ item.note }}</p>
                      <p v-if="!item.option && !item.material && !item.note">-</p>
                    </div>
                  </td>
                  <td class="py-3 pr-3 text-xs">
                    <span class="inline-flex rounded-full px-2 py-0.5 font-medium" :class="item.isAddon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'">
                      {{ item.isAddon ? 'ค่าเสริม' : 'รวมในแพคเกจ' }}
                    </span>
                  </td>
                  <td class="py-3 text-right text-neutral-700">{{ item.quantity }}</td>
                  <td class="py-3 text-right text-neutral-700">{{ currency(item.unitPrice) }}</td>
                  <td class="py-3 text-right font-semibold text-neutral-900">{{ currency(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="mt-4 rounded-xl border border-[#ecfdf3] bg-[#f9fefb] p-4">
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between text-neutral-600">
                  <span>รวมทุกรายการสินค้า</span>
                  <span class="font-medium text-neutral-900">{{ currency(detailItemsTotal) }}</span>
                </div>
                <div v-if="packageIncludedAmount > 0" class="flex items-center justify-between text-neutral-600">
                  <span>รวมอยู่ในราคาหลักแล้ว</span>
                  <span class="font-medium text-neutral-900">{{ currency(packageIncludedAmount) }}</span>
                </div>
                <div class="flex items-center justify-between text-neutral-600">
                  <span>ค่าเสริมจากรายการสินค้า</span>
                  <span class="font-medium text-neutral-900">{{ currency(detailAddonTotal) }}</span>
                </div>
                <div class="flex items-center justify-between text-neutral-600">
                  <span>ค่าเสริมในใบสั่ง</span>
                  <span class="font-medium text-neutral-900">{{ currency(orderAddonTotal) }}</span>
                </div>
                <div class="flex items-center justify-between border-t border-[#e2fbe8] pt-2" :class="isDetailTotalMatched ? 'text-[#166534]' : 'text-amber-700'">
                  <span class="font-medium">ส่วนต่าง</span>
                  <span class="font-semibold">{{ currency(detailTotalDiff) }}</span>
                </div>
              </div>

              <p class="mt-2 text-xs" :class="isDetailTotalMatched ? 'text-[#166534]' : 'text-amber-700'">
                {{ isDetailTotalMatched ? 'ค่าเสริมตรงกัน' : 'ค่าเสริมไม่ตรงกัน โปรดตรวจสอบรายการที่คิดค่าเพิ่ม' }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-[#bbf7d0] bg-white p-5 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)]">
          <h2 class="text-sm font-semibold text-neutral-700 mb-3">สรุปราคา</h2>
          <div class="space-y-3">
            <div class="rounded-xl border border-[#ecfdf3] bg-[#f9fefb] p-3">
              <p class="text-xs text-neutral-500">ยอดรวมสุทธิ</p>
              <p class="mt-1 text-2xl font-bold text-[#166534]">{{ currency(booking.totalPrice) }}</p>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div class="rounded-lg bg-white border border-[#ecfdf3] px-3 py-2">
                  <p class="text-[11px] text-neutral-500">ราคาสินค้า</p>
                  <p class="font-semibold text-neutral-900">{{ currency(booking.basePrice) }}</p>
                </div>
                <div class="rounded-lg bg-white border border-[#ecfdf3] px-3 py-2">
                  <p class="text-[11px] text-neutral-500">ค่าเสริม</p>
                  <p class="font-semibold text-neutral-900">{{ currency(booking.addonPrice) }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-[#ecfdf3] bg-white p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-neutral-600">ชำระแล้ว</span>
                <span class="font-semibold text-neutral-900">{{ currency(paidAmountValue) }}</span>
              </div>
              <div class="h-2 w-full rounded-full bg-[#ecfdf3] overflow-hidden">
                <div class="h-full rounded-full bg-[#22c55e] transition-all" :style="{ width: `${paymentProgressPercent}%` }" />
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-neutral-500">{{ paymentProgressPercent }}% ของยอดรวม</span>
                <span class="font-medium" :class="outstandingAmount > 0 ? 'text-amber-700' : 'text-[#166534]'">{{ paymentProgressLabel }}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 pt-1">
                <div class="rounded-lg bg-[#f9fefb] border border-[#ecfdf3] px-3 py-2">
                  <p class="text-[11px] text-neutral-500">มัดจำ</p>
                  <p class="font-semibold text-neutral-900">{{ currency(booking.depositAmount) }}</p>
                </div>
                <div class="rounded-lg px-3 py-2 border" :class="outstandingAmount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-[#f0fdf4] border-[#bbf7d0]'">
                  <p class="text-[11px]" :class="outstandingAmount > 0 ? 'text-amber-700' : 'text-[#166534]'">ค้างชำระ</p>
                  <p class="font-semibold" :class="outstandingAmount > 0 ? 'text-amber-800' : 'text-[#166534]'">{{ currency(outstandingAmount) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-2xl border border-[#b7f0cc] bg-[radial-gradient(circle_at_12%_18%,rgba(34,197,94,.14),transparent_34%),linear-gradient(145deg,#ffffff_0%,#f3fff8_54%,#edfff5_100%)] p-5 shadow-[0_25px_45px_-35px_rgba(22,101,52,0.8)]">
          <div class="pointer-events-none absolute -top-12 right-0 h-36 w-36 rounded-full bg-emerald-300/20 blur-3xl" />
          <h2 class="text-sm font-semibold text-neutral-700">การชำระเงิน</h2>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <div class="inline-flex items-center rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-xs font-medium text-[#166534]">
              แผนการชำระ: {{ paymentPlanLabel }}
            </div>
            <div class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium" :class="outstandingAmount > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-100 text-[#166534]'">
              {{ paymentProgressLabel }}
            </div>
          </div>

          <div class="mt-3 rounded-2xl border border-[#bbf7d0] bg-white/85 px-4 py-4 backdrop-blur-sm">
            <p class="text-xs text-neutral-500">ยอดที่ต้องชำระตอนนี้</p>
            <div class="mt-1 flex flex-wrap items-end justify-between gap-3">
              <p class="text-3xl font-extrabold tracking-tight text-[#166534] md:text-4xl">{{ currency(paymentAmount) }}</p>
              <p class="text-xs text-neutral-500">คงเหลือทั้งหมด {{ currency(outstandingAmount) }}</p>
            </div>
            <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#dcfce7]">
              <div class="h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#16a34a_100%)] transition-all duration-300" :style="{ width: `${paymentProgressPercent}%` }" />
            </div>
            <p class="mt-1 text-[11px] text-neutral-500">ชำระแล้ว {{ paymentProgressPercent }}% ของยอดรวม</p>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#166534] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-16px_rgba(22,101,52,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#14532d]"
              @click="paymentModalRef?.open()"
            >
              {{ paymentActionLabel }}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-[#86efac] bg-white px-4 py-2.5 text-sm font-semibold text-[#166534] transition-all hover:-translate-y-0.5 hover:bg-[#f0fdf4]"
              @click="openUploadSlip"
            >
              อัปโหลดสลิป
            </button>
          </div>

          <div class="mt-4 rounded-xl border border-[#d9fce7] bg-white/80 p-3">
            <p class="text-xs font-medium text-neutral-500">สลิปที่อัปโหลดแล้ว</p>
            <div v-if="loadingAttachments" class="mt-2 text-sm text-neutral-400">กำลังโหลด...</div>
            <div v-else class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div
                v-for="a in attachments"
                :key="a.id"
                class="group relative overflow-hidden rounded-xl border border-[#d8f5e4] bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-24px_rgba(22,101,52,0.9)]"
              >
                <button
                  type="button"
                  class="absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-500 text-white shadow-sm transition hover:bg-red-600 disabled:opacity-60"
                  :disabled="deletingAttachmentId === a.id"
                  @click="removeAttachment(a.id)"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>

                <a :href="a.fileUrl" target="_blank" rel="noopener noreferrer" class="block">
                  <div class="h-28 border-b border-[#eefcf3] bg-[#f8fefb]">
                    <img v-if="isImageAttachment(a)" :src="a.fileUrl" :alt="a.fileName" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full items-center justify-center text-xs font-semibold text-neutral-500">FILE</div>
                  </div>
                  <div class="space-y-1 px-2.5 py-2">
                    <p class="truncate text-xs font-medium text-neutral-700">{{ a.fileName }}</p>
                    <p v-if="a.paymentMethodId && paymentMethodLabelById[a.paymentMethodId]" class="truncate text-[11px] text-[#166534]">
                      ช่องทาง: {{ paymentMethodLabelById[a.paymentMethodId] }}
                    </p>
                    <p v-if="a.paymentAmount" class="truncate text-[11px] text-emerald-700">
                      ยอดสลิป: {{ currency(a.paymentAmount) }}
                    </p>
                    <div class="flex items-center justify-between gap-1">
                      <span class="text-[11px] text-neutral-400">{{ attachmentSizeLabel(a.fileSize) }}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full border" :class="a.isVerified ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]' : 'bg-yellow-50 text-yellow-700 border-yellow-200'">
                        {{ a.isVerified ? 'ตรวจแล้ว' : 'รอตรวจ' }}
                      </span>
                    </div>
                  </div>
                </a>
              </div>

              <button
                type="button"
                class="flex h-full min-h-[162px] flex-col items-center justify-center rounded-xl border border-dashed border-[#60a5fa] bg-[#f8fbff] px-3 py-4 text-[#1d4ed8] transition-all hover:-translate-y-0.5 hover:bg-[#eef5ff]"
                @click="openUploadSlip"
              >
                <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 16V4" />
                  <path d="m7 9 5-5 5 5" />
                  <path d="M20 16.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5" />
                </svg>
                <p class="mt-2 text-sm font-medium">Upload file</p>
              </button>
            </div>
            <p v-if="!loadingAttachments && attachments.length === 0" class="mt-2 text-xs text-neutral-400">ยังไม่มีไฟล์ แนบสลิปได้ที่การ์ด Upload file</p>
          </div>
        </div>

        <div class="rounded-2xl border border-[#bbf7d0] bg-white p-5 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)]">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-neutral-700">ข้อความถึงทีมงาน</h2>
            <button
              type="button"
              class="rounded-lg border border-[#bbf7d0] px-2.5 py-1 text-xs font-medium text-[#166534] hover:bg-[#f0fdf4] transition-colors"
              @click="loadMessages"
            >
              รีเฟรช
            </button>
          </div>

          <div ref="messageThreadRef" class="rounded-xl border border-[#ecfdf3] bg-[#f9fefb] p-3 h-72 overflow-y-auto">
            <div v-if="loadingMessages" class="text-sm text-neutral-400">กำลังโหลดข้อความ...</div>
            <div v-else-if="messages.length === 0" class="text-sm text-neutral-400">ยังไม่มีข้อความ</div>
            <div v-else class="space-y-2">
              <div
                v-for="m in messages"
                :key="m.id"
                class="flex"
                :class="m.senderType === 'customer' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[85%] rounded-2xl px-3 py-2"
                  :class="m.senderType === 'customer' ? 'bg-[#166534] text-white' : m.senderType === 'admin' ? 'bg-white border border-[#bbf7d0] text-neutral-800' : 'bg-neutral-100 text-neutral-700'"
                >
                  <p class="text-sm whitespace-pre-wrap break-words">{{ m.message }}</p>
                  <p class="mt-1 text-[11px]" :class="m.senderType === 'customer' ? 'text-emerald-100' : 'text-neutral-400'">
                    {{ formatDateTime(m.createdAt) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 flex items-end gap-2">
            <textarea
              v-model="messageInput"
              rows="2"
              maxlength="1000"
              placeholder="พิมพ์ข้อความถึงทีมงาน..."
              class="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#166534]"
              @input="markTyping"
              @focus="markTyping"
              @blur="stopTyping"
              @keydown.enter.exact.prevent="sendMessage"
            />
            <button
              type="button"
              class="shrink-0 rounded-xl bg-[#166534] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14532d] disabled:opacity-60"
              :disabled="sendingMessage || !messageInput.trim()"
              @click="sendMessage"
            >
              {{ sendingMessage ? 'กำลังส่ง...' : 'ส่ง' }}
            </button>
          </div>
          <p class="mt-1 text-[11px] text-neutral-400">กด Enter เพื่อส่ง และกด Shift+Enter เพื่อขึ้นบรรทัดใหม่</p>
        </div>
      </div>
    </UContainer>

    <BaseModal ref="paymentModalRef" id="customer-order-payment" title="ช่องทางชำระเงิน" :backdrop-close="true">
      <div class="space-y-3">
        <div class="rounded-2xl border border-[#bbf7d0] bg-[radial-gradient(circle_at_15%_20%,rgba(34,197,94,.18),transparent_36%),linear-gradient(140deg,#ffffff_0%,#f0fdf4_100%)] px-4 py-3">
          <div class="inline-flex items-center rounded-full border border-[#bbf7d0] bg-white px-2.5 py-1 text-xs font-medium text-[#166534]">
            {{ paymentPlanLabel }}
          </div>
          <p class="mt-2 text-sm text-neutral-600">ยอดที่ต้องชำระตอนนี้</p>
          <p class="mt-1 text-4xl font-extrabold tracking-tight text-[#166534]">{{ currency(paymentAmount) }}</p>
        </div>

        <div class="rounded-xl border border-[#dcfce7] bg-white px-4 py-3 text-sm text-neutral-700">
          <p class="font-semibold text-neutral-800 mb-2">วิธีการชำระเงิน</p>
          <div v-if="paymentMethodsPending" class="rounded-lg border border-dashed border-[#bbf7d0] bg-[#f9fefb] px-3 py-2 text-neutral-500">กำลังโหลดช่องทางชำระเงิน...</div>
          <div v-else-if="paymentMethods.length" class="space-y-2.5">
            <div
              v-for="method in paymentMethods"
              :key="method.id"
              class="rounded-xl border px-3 py-3"
              :class="paymentChannelTone(method.channel).card"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="paymentChannelTone(method.channel).chip">{{ paymentChannelLabel(method.channel, method.bankName) }}</p>
                  <p class="mt-1 text-sm font-semibold text-neutral-900">{{ method.accountName }}</p>
                </div>
              </div>

              <div class="mt-2 space-y-1.5">
                <div v-if="method.accountNumber" class="flex items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/80 px-2.5 py-1.5">
                  <p class="text-neutral-700">เลขบัญชี: <span class="font-semibold text-neutral-900">{{ method.accountNumber }}</span></p>
                  <button type="button" class="rounded-md border border-[#bbf7d0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#166534]" @click="copyPaymentValue(method.accountNumber, 'เลขบัญชี')">คัดลอก</button>
                </div>
                <div v-if="method.promptPayId" class="flex items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/80 px-2.5 py-1.5">
                  <p class="text-neutral-700">เลขพร้อมเพย์: <span class="font-semibold text-neutral-900">{{ method.promptPayId }}</span></p>
                  <button type="button" class="rounded-md border border-[#bbf7d0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#166534]" @click="copyPaymentValue(method.promptPayId, 'เลขพร้อมเพย์')">คัดลอก</button>
                </div>
              </div>

              <div v-if="method.qrCodeUrl" class="mt-2">
                <p class="mb-1 text-xs text-neutral-500">QR Code</p>
                <img :src="method.qrCodeUrl" alt="Payment QR" class="h-44 w-full rounded-lg border border-white/70 bg-white object-contain p-1" loading="lazy" />
              </div>
            </div>
          </div>
          <p v-else-if="paymentMethodsError" class="rounded-lg border border-dashed border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">โหลดช่องทางชำระเงินจากระบบไม่สำเร็จ</p>
          <p v-else class="rounded-lg border border-dashed border-[#bbf7d0] bg-[#f9fefb] px-3 py-2 text-neutral-500">ยังไม่ได้ตั้งค่าช่องทางชำระเงิน</p>
        </div>

        <p class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">หลังโอนเงินแล้ว กดปุ่ม "อัปโหลดสลิป" เพื่อส่งหลักฐานให้ทีมงานตรวจสอบ</p>
      </div>
      <template #actions>
        <div class="w-full flex justify-end">
          <button type="button" class="ns-ui-btn ns-ui-btn-secondary" @click="paymentModalRef?.close()">ปิด</button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="uploadSlipModalRef" id="customer-order-upload-slip" title="อัปโหลดสลิป" :backdrop-close="true">
      <div class="space-y-3">
        <div class="space-y-1">
          <label class="text-sm font-medium text-neutral-700">เลือกช่องทางชำระเงิน <span class="text-red-500">*</span></label>
          <div v-if="paymentMethodsPending" class="rounded-xl border border-dashed border-[#bbf7d0] bg-[#f9fefb] px-3 py-2 text-sm text-neutral-500">กำลังโหลดช่องทางชำระเงิน...</div>
          <div v-else-if="paymentMethods.length" class="space-y-1.5">
            <label
              v-for="method in paymentMethods"
              :key="`slip-method-${method.id}`"
              class="block cursor-pointer rounded-xl border bg-white px-3 py-2 transition-colors"
              :class="selectedSlipPaymentMethodId === method.id ? 'border-[#166534] bg-[#f0fdf4]' : 'border-neutral-200 hover:border-[#bbf7d0]'"
            >
              <input v-model="selectedSlipPaymentMethodId" type="radio" :value="method.id" class="sr-only" />
              <p class="text-sm font-medium text-neutral-900">{{ paymentChannelLabel(method.channel, method.bankName) }}</p>
              <p class="text-xs text-neutral-600">ชื่อบัญชี: {{ method.accountName }}</p>
              <p v-if="method.accountNumber" class="text-xs text-neutral-600">เลขบัญชี: {{ method.accountNumber }}</p>
              <p v-if="method.promptPayId" class="text-xs text-neutral-600">เลขพร้อมเพย์: {{ method.promptPayId }}</p>
            </label>
          </div>
          <p v-else-if="paymentMethodsError" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">โหลดช่องทางชำระเงินไม่สำเร็จ</p>
          <p v-else class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">ยังไม่ได้ตั้งค่าช่องทางชำระเงิน</p>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-neutral-700">ยอดที่โอนในไฟล์สลิป <span class="text-red-500">*</span></label>
          <input v-model.number="slipAmount" type="number" min="0" step="0.01" placeholder="เช่น 2500" class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#166534]" />
          <p class="text-xs text-neutral-500">ระบบจะบันทึกยอดแยกตามไฟล์ เพื่อให้แอดมินตรวจสอบการจ่ายหลายครั้งได้ชัดเจน</p>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-neutral-700">เลือกไฟล์สลิป</label>
          <input ref="slipInputRef" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onSlipFileChange" />
          <button type="button" class="w-full rounded-xl border border-dashed border-[#60a5fa] bg-[#f8fbff] px-3 py-5 text-sm font-medium text-[#1d4ed8] transition-colors hover:bg-[#eef5ff]" @click="slipInputRef?.click()">
            เลือกไฟล์จากเครื่อง
          </button>
          <p class="text-xs text-neutral-500">รองรับไฟล์ PNG, JPG, WEBP ขนาดไม่เกิน 10MB</p>
        </div>
        <div v-if="slipFile" class="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
          ไฟล์ที่เลือก: {{ slipFile.name }} ({{ Math.max(1, Math.round((slipFile.size || 0) / 1024)) }} KB)
        </div>
        <div v-else class="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-700">
          กรุณาเลือกไฟล์ก่อนกดยืนยันอัปโหลด
        </div>
      </div>
      <template #actions>
        <div class="w-full flex items-center justify-end gap-2">
          <button type="button" class="ns-ui-btn ns-ui-btn-secondary" @click="uploadSlipModalRef?.close()">ยกเลิก</button>
          <button type="button" :disabled="uploadingSlip || !slipFile || !selectedSlipPaymentMethodId || !slipAmount || slipAmount <= 0" class="rounded-xl bg-[#166534] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14532d] disabled:opacity-60" @click="submitSlip">
            {{ uploadingSlip ? 'กำลังอัปโหลด...' : 'ยืนยันอัปโหลด' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="cancelRequestModalRef" id="customer-order-cancel-request" title="ส่งคำขอยกเลิก" :backdrop-close="true">
      <div class="space-y-3">
        <p class="text-sm text-neutral-700">กรุณาระบุเหตุผลที่ต้องการยกเลิกคำสั่งซื้อ ระบบจะส่งให้แอดมินพิจารณา</p>
        <textarea
          v-model="cancelReasonInput"
          rows="4"
          maxlength="500"
          placeholder="เช่น เปลี่ยนวันงานกะทันหัน ต้องการเลื่อนและยกเลิกออเดอร์นี้"
          class="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#166534]"
        />
      </div>
      <template #actions>
        <div class="w-full flex items-center justify-end gap-2">
          <button type="button" class="ns-ui-btn ns-ui-btn-secondary" :disabled="requestingCancel" @click="cancelRequestModalRef?.close()">ปิด</button>
          <button type="button" class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" :disabled="requestingCancel" @click="requestSubmitCancelRequest">
            ยืนยันส่งคำขอ
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="cancelRequestConfirmModalRef" id="customer-order-cancel-request-confirm" title="ยืนยันการส่งคำขอยกเลิก" :backdrop-close="true">
      <div class="space-y-3">
        <p class="text-sm text-neutral-700">ยืนยันว่าจะส่งคำขอยกเลิกคำสั่งซื้อนี้ใช่หรือไม่?</p>
        <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p class="font-semibold">เหตุผลที่ส่ง</p>
          <p class="mt-1 whitespace-pre-wrap break-words">{{ cancelReasonInput }}</p>
        </div>
        <p class="text-xs text-neutral-500">เมื่อส่งแล้ว ระบบจะรอการอนุมัติจากแอดมิน</p>
      </div>
      <template #actions>
        <div class="w-full flex items-center justify-end gap-2">
          <button type="button" class="ns-ui-btn ns-ui-btn-secondary" :disabled="requestingCancel" @click="cancelRequestConfirmModalRef?.close()">กลับไปแก้ไข</button>
          <button type="button" class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" :disabled="requestingCancel" @click="submitCancelRequest">
            {{ requestingCancel ? 'กำลังส่ง...' : 'ยืนยันส่งจริง' }}
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
