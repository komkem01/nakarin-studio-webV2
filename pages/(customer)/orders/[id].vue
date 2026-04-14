<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'รายละเอียดคำสั่งซื้อ - Nakarin Studio' })

const route = useRoute()
const { getSession, authFetch } = useCustomerAuth()
const toast = useAppToast()
const paymentModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const uploadSlipModalRef = ref<InstanceType<typeof BaseModal> | null>(null)

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
  fileName: string
  fileUrl: string
  mimeType: string | null
  fileSize: number | null
  isVerified: boolean
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
const messages = ref<BookingMessage[]>([])
const loadingMessages = ref(false)
const sendingMessage = ref(false)
const messageInput = ref('')
const messageThreadRef = ref<HTMLElement | null>(null)
const isTypingMessage = ref(false)
const uploadingSlip = ref(false)
const slipForm = reactive({
  fileUrl: '',
  fileName: '',
  mimeType: 'image/jpeg',
  fileSize: 0,
})
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
  return booking.value.balanceAmount > 0 ? booking.value.balanceAmount : booking.value.depositAmount
})

const normalizeAttachment = (src: unknown): BookingAttachment => {
  const d = asRecord(src)
  return {
    id: pickStr(d, 'id'),
    attachmentType: pickStr(d, 'attachmentType', 'attachment_type'),
    fileName: pickStr(d, 'fileName', 'file_name'),
    fileUrl: pickStr(d, 'fileUrl', 'file_url'),
    mimeType: pickStr(d, 'mimeType', 'mime_type') || null,
    fileSize: pickNum(d, 'fileSize', 'file_size') || null,
    isVerified: Boolean(d.isVerified ?? d.is_verified),
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

const openUploadSlip = () => {
  slipForm.fileUrl = ''
  slipForm.fileName = booking.value?.bookingNo ? `payment-slip-${booking.value.bookingNo}` : 'payment-slip'
  slipForm.mimeType = 'image/jpeg'
  slipForm.fileSize = 0
  uploadSlipModalRef.value?.open()
}

const submitSlip = async () => {
  if (!booking.value?.id) return
  if (!slipForm.fileUrl.trim()) {
    toast.warning('กรุณากรอกลิงก์ไฟล์สลิป')
    return
  }
  if (!/^https?:\/\//i.test(slipForm.fileUrl.trim())) {
    toast.warning('ลิงก์ไฟล์สลิปต้องขึ้นต้นด้วย http:// หรือ https://')
    return
  }

  uploadingSlip.value = true
  try {
    await authFetch('/api/v1/booking-attachments', {
      method: 'POST',
      body: {
        bookingId: booking.value.id,
        attachmentType: 'payment_slip',
        fileName: slipForm.fileName.trim() || 'payment-slip',
        fileUrl: slipForm.fileUrl.trim(),
        mimeType: slipForm.mimeType.trim() || 'image/jpeg',
        fileSize: Number(slipForm.fileSize) || 1,
      },
    })
    toast.success('อัปโหลดสลิปเรียบร้อย')
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
              <h1 class="text-xl font-bold text-neutral-900">รายละเอียดคำสั่งซื้อ</h1>
              <p class="text-sm text-neutral-500 mt-1">หมายเลขคำสั่งซื้อ #{{ booking.bookingNo }}</p>
            </div>
            <span class="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border" :class="statusColor(booking.status)">
              {{ statusLabel(booking.status) }}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-neutral-400">รายการ</p>
              <p class="font-medium text-neutral-900 mt-1">{{ booking.packageName || booking.baiseeStyle || 'บายศรี' }}</p>
            </div>
            <div>
              <p class="text-neutral-400">วันงาน</p>
              <p class="font-medium text-neutral-900 mt-1">{{ formatDate(booking.eventDate) }}</p>
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

        <div class="rounded-2xl border border-[#bbf7d0] bg-white p-5 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)]">
          <h2 class="text-sm font-semibold text-neutral-700 mb-3">สรุปราคา</h2>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between text-neutral-600"><span>ราคาสินค้า</span><span>{{ currency(booking.basePrice) }}</span></div>
            <div class="flex items-center justify-between text-neutral-600"><span>ค่าเสริม</span><span>{{ currency(booking.addonPrice) }}</span></div>
            <div class="flex items-center justify-between font-semibold text-neutral-900 border-t border-[#ecfdf3] pt-2"><span>ยอดรวม</span><span class="text-[#166534]">{{ currency(booking.totalPrice) }}</span></div>
            <div class="flex items-center justify-between text-neutral-500"><span>มัดจำ</span><span>{{ currency(booking.depositAmount) }}</span></div>
            <div class="flex items-center justify-between text-neutral-500"><span>ชำระแล้ว</span><span>{{ currency(booking.paidAmount) }}</span></div>
            <div class="flex items-center justify-between text-neutral-500"><span>ค้างชำระ</span><span>{{ currency(booking.balanceAmount) }}</span></div>
          </div>
        </div>

        <div class="rounded-2xl border border-[#bbf7d0] bg-white p-5 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)]">
          <h2 class="text-sm font-semibold text-neutral-700 mb-3">การชำระเงิน</h2>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-xl bg-[#166534] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14532d] transition-colors"
              @click="paymentModalRef?.open()"
            >
              ชำระเงิน
            </button>
            <button
              type="button"
              class="rounded-xl border border-[#bbf7d0] px-4 py-2 text-sm font-semibold text-[#166534] hover:bg-[#f0fdf4] transition-colors"
              @click="openUploadSlip"
            >
              อัปโหลดสลิป
            </button>
          </div>

          <div class="mt-4">
            <p class="text-xs text-neutral-500 mb-2">สลิปที่อัปโหลดแล้ว</p>
            <div v-if="loadingAttachments" class="text-sm text-neutral-400">กำลังโหลด...</div>
            <div v-else-if="attachments.length === 0" class="text-sm text-neutral-400">ยังไม่มีสลิปที่อัปโหลด</div>
            <div v-else class="space-y-2">
              <a
                v-for="a in attachments"
                :key="a.id"
                :href="a.fileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="block rounded-xl border border-[#ecfdf3] bg-[#f0fdf4] px-3 py-2 hover:bg-white transition-colors"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-neutral-800 truncate">{{ a.fileName }}</p>
                  <span class="text-[11px] px-2 py-0.5 rounded-full border" :class="a.isVerified ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]' : 'bg-yellow-50 text-yellow-700 border-yellow-200'">
                    {{ a.isVerified ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ' }}
                  </span>
                </div>
              </a>
            </div>
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
        <p class="text-sm text-neutral-600">ยอดที่ต้องชำระตอนนี้</p>
        <p class="text-2xl font-bold text-[#166534]">{{ currency(paymentAmount) }}</p>
        <div class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-neutral-700">
          โอนเข้าบัญชี: ธนาคารกสิกรไทย 123-4-56789-0<br>
          ชื่อบัญชี: Nakarin Studio
        </div>
      </div>
      <template #actions>
        <div class="w-full flex justify-end">
          <button type="button" class="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50" @click="paymentModalRef?.close()">ปิด</button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="uploadSlipModalRef" id="customer-order-upload-slip" title="อัปโหลดสลิป" :backdrop-close="true">
      <div class="space-y-3">
        <div class="space-y-1">
          <label class="text-sm font-medium text-neutral-700">ลิงก์ไฟล์สลิป</label>
          <input v-model="slipForm.fileUrl" type="url" placeholder="https://..." class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-sm font-medium text-neutral-700">ชื่อไฟล์</label>
            <input v-model="slipForm.fileName" type="text" class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#166534]" />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-neutral-700">MimeType</label>
            <input v-model="slipForm.mimeType" type="text" class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#166534]" />
          </div>
        </div>
      </div>
      <template #actions>
        <div class="w-full flex items-center justify-end gap-2">
          <button type="button" class="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50" @click="uploadSlipModalRef?.close()">ยกเลิก</button>
          <button type="button" :disabled="uploadingSlip" class="rounded-xl bg-[#166534] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14532d] disabled:opacity-60" @click="submitSlip">
            {{ uploadingSlip ? 'กำลังอัปโหลด...' : 'ยืนยันอัปโหลด' }}
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
