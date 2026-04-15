<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'คำสั่งซื้อของฉัน - Nakarin Studio' })

const { getSession, authFetch } = useCustomerAuth()
const toast = useAppToast()

const session = ref(getSession())
const member = computed(() => session.value?.member)

onMounted(() => {
  session.value = getSession()
  if (!session.value) navigateTo('/auth/login?redirect=/orders')
})

type Booking = {
  id: string
  bookingNo: string
  status: string
  packageName: string | null
  baiseeStyle: string | null
  eventDate: string | null
  totalPrice: number
  paidAmount: number
  balanceAmount: number
  statusUpdatedAt: string
}

type OrderFilter = 'all' | 'pending' | 'in_production' | 'delivered'

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

const normalizeBooking = (src: unknown): Booking => {
  const d = asRecord(src)
  return {
    id: pickStr(d, 'id'),
    bookingNo: pickStr(d, 'booking_no'),
    status: pickStr(d, 'status', 'draft') || 'draft',
    packageName: pickNullable(d, 'package_name'),
    baiseeStyle: pickNullable(d, 'baisee_style'),
    eventDate: pickNullable(d, 'event_date'),
    totalPrice: pickNum(d, 'total_price'),
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

const bookings = ref<Booking[]>([])
const loading = ref(true)
const errorMessage = ref('')
const statusFilter = ref<OrderFilter>('all')

const filterOptions: Array<{ value: OrderFilter; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอยืนยัน' },
  { value: 'in_production', label: 'กำลังผลิต' },
  { value: 'delivered', label: 'จัดส่งแล้ว' },
]

const filteredBookings = computed(() => {
  if (statusFilter.value === 'all') return bookings.value
  if (statusFilter.value === 'pending') return bookings.value.filter(b => ['pending', 'draft', 'confirmed'].includes(b.status))
  if (statusFilter.value === 'in_production') return bookings.value.filter(b => ['in_production', 'ready', 'processing'].includes(b.status))
  if (statusFilter.value === 'delivered') return bookings.value.filter(b => ['delivered', 'completed'].includes(b.status))
  return bookings.value
})

const statusLabel = (s: string) => STATUS_LABEL[s] || s
const statusColor = (s: string) => STATUS_COLOR[s] || 'bg-neutral-100 text-neutral-500 border-neutral-200'
const paidAmountValue = (b: Booking) => Math.max(0, b.paidAmount)
const outstandingAmount = (b: Booking) => Math.max(0, b.balanceAmount)
const paymentPercent = (b: Booking) => {
  const total = Math.max(0, b.totalPrice)
  if (total <= 0) return 0
  const percent = Math.round((paidAmountValue(b) / total) * 100)
  return Math.max(0, Math.min(100, percent))
}

const currency = (v: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v)

const formatDate = (iso: string | null) => {
  if (!iso) return '-'
  try {
    return new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const fetchOrders = async () => {
  if (!member.value?.id) return
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await authFetch<any>('/api/v1/bookings', {
      query: { memberId: member.value.id, size: 100 },
    })
    const items: unknown[] = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.data) ? res.data : []
    bookings.value = items.map(normalizeBooking)
  } catch {
    errorMessage.value = 'โหลดรายการคำสั่งซื้อไม่สำเร็จ'
    toast.error('โหลดรายการคำสั่งซื้อไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

onMounted(fetchOrders)
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#f0fdf4_0%,_#ffffff_45%)] py-10">
    <UContainer class="max-w-5xl">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-neutral-900">คำสั่งซื้อของฉัน</h1>
          <p class="text-sm text-neutral-500 mt-1">ดูสถานะและรายละเอียดออเดอร์ทั้งหมด</p>
        </div>
        <NuxtLink to="/booking" class="ns-ui-btn ns-ui-btn-primary">
          + สั่งใหม่
        </NuxtLink>
      </div>

      <div class="mb-5 rounded-2xl border border-[#bbf7d0] bg-white px-4 py-3 flex flex-wrap items-center gap-2">
        <button
          v-for="opt in filterOptions"
          :key="opt.value"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="statusFilter === opt.value ? 'bg-[#166534] text-white border-[#166534]' : 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0] hover:bg-white'"
          @click="statusFilter = opt.value"
        >
          {{ opt.label }}
        </button>
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

      <div v-else-if="filteredBookings.length === 0" class="rounded-2xl border border-[#bbf7d0] bg-white px-6 py-14 text-center">
        <div class="text-neutral-600 font-medium">ยังไม่มีรายการสั่งซื้อ</div>
        <div class="text-sm text-neutral-400 mt-1 mb-5">ไม่พบคำสั่งซื้อในสถานะที่เลือก</div>
        <NuxtLink to="/booking" class="ns-ui-btn ns-ui-btn-primary">
          สั่งบายศรีเลย
        </NuxtLink>
      </div>

      <div v-else class="space-y-3">
        <NuxtLink
          v-for="b in filteredBookings"
          :key="b.id"
          :to="`/orders/${b.id}`"
          class="block rounded-2xl border border-[#bbf7d0] bg-white px-5 py-4 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)] hover:shadow-[0_16px_34px_-20px_rgba(22,101,52,0.55)] transition-shadow"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <div class="font-semibold text-neutral-900 text-sm leading-snug">{{ b.packageName || 'บายศรี' }}</div>
              <div v-if="b.baiseeStyle" class="text-xs text-neutral-500 mt-0.5">สไตล์: {{ b.baiseeStyle }}</div>
              <div class="text-xs text-neutral-400 mt-0.5"># {{ b.bookingNo }}</div>
            </div>
            <span class="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border" :class="statusColor(b.status)">
              {{ statusLabel(b.status) }}
            </span>
          </div>

          <div class="flex items-end justify-between gap-2 text-sm">
            <div class="space-y-0.5">
              <div v-if="b.eventDate" class="text-neutral-500 text-xs">วันงาน {{ formatDate(b.eventDate) }}</div>
              <div class="text-neutral-400 text-xs">อัพเดต {{ formatDate(b.statusUpdatedAt) }}</div>
            </div>
            <div class="min-w-[190px] rounded-xl border border-[#ecfdf3] bg-[#f9fefb] px-3 py-2">
              <p class="text-[11px] text-neutral-500">ยอดสุทธิ</p>
              <p class="text-base font-bold text-[#166534]">{{ currency(b.totalPrice) }}</p>
              <div class="mt-2 h-1.5 w-full rounded-full bg-[#ecfdf3] overflow-hidden">
                <div class="h-full rounded-full bg-[#22c55e]" :style="{ width: `${paymentPercent(b)}%` }" />
              </div>
              <div class="mt-1 flex items-center justify-between text-[11px]">
                <span class="text-neutral-500">ชำระแล้ว {{ currency(paidAmountValue(b)) }}</span>
                <span :class="outstandingAmount(b) > 0 ? 'text-amber-700 font-medium' : 'text-[#166534] font-medium'">
                  คงเหลือ {{ currency(outstandingAmount(b)) }}
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </UContainer>
  </div>
</template>
