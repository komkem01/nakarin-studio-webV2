<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'ข้อมูลของฉัน - Nakarin Studio' })

const { getSession, clearSession, authFetch } = useCustomerAuth()
const toast = useAppToast()
const logoutConfirmModalRef = ref<InstanceType<typeof BaseModal> | null>(null)

// ── Session ──────────────────────────────────────────────────────────────────

const session = ref(getSession())
const member = computed(() => session.value?.member)

onMounted(() => {
  session.value = getSession()
  if (!session.value) navigateTo('/auth/login?redirect=/profile')
})

// ── Bookings ─────────────────────────────────────────────────────────────────

type Booking = {
  id: string
  bookingNo: string
  status: string
  packageName: string | null
  baiseeStyle: string | null
  eventDate: string | null
  totalPrice: number
  depositAmount: number
  paidAmount: number
  balanceAmount: number
  statusUpdatedAt: string
}

const asRecord = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const pickStr = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) { const v = o[k]; if (typeof v === 'string' && v) return v } return ''
}
const pickNum = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) { const v = Number(o[k]); if (Number.isFinite(v)) return v } return 0
}
const pickNullable = (o: Record<string, unknown>, key: string): string | null => {
  const v = o[key]; return typeof v === 'string' && v.trim() ? v : null
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
    depositAmount: pickNum(d, 'deposit_amount'),
    paidAmount: pickNum(d, 'paid_amount'),
    balanceAmount: pickNum(d, 'balance_amount'),
    statusUpdatedAt: pickStr(d, 'status_updated_at'),
  }
}

const bookings = ref<Booking[]>([])
const loadingBookings = ref(true)
const bookingError = ref('')

const fetchBookings = async () => {
  if (!member.value?.id) return
  loadingBookings.value = true
  bookingError.value = ''
  try {
    const res = await authFetch<any>('/api/v1/bookings', {
      query: { memberId: member.value.id, size: 50 },
    })
    const items: unknown[] = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.data) ? res.data : []
    bookings.value = items.map(normalizeBooking)
  } catch {
    bookingError.value = 'โหลดข้อมูลการสั่งซื้อไม่สำเร็จ'
  } finally {
    loadingBookings.value = false
  }
}

onMounted(fetchBookings)

// ── Status helpers ────────────────────────────────────────────────────────────

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

const statusLabel = (s: string) => STATUS_LABEL[s] || s

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

const statusColor = (s: string) => STATUS_COLOR[s] || 'bg-neutral-100 text-neutral-500 border-neutral-200'

// ── Helpers ───────────────────────────────────────────────────────────────────

const currency = (v: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v)

const formatDate = (iso: string | null) => {
  if (!iso) return '-'
  try {
    return new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso))
  } catch { return iso }
}

// ── Logout ────────────────────────────────────────────────────────────────────

const loggingOut = ref(false)

const requestLogout = () => {
  logoutConfirmModalRef.value?.open()
}

const handleLogout = async () => {
  logoutConfirmModalRef.value?.close()
  loggingOut.value = true
  await clearSession()
}
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#f0fdf4_0%,_#ffffff_45%)] py-10">
    <UContainer class="max-w-4xl">

      <!-- ── ข้อมูลผู้ใช้ ────────────────────────────────────────────────── -->
      <div class="rounded-2xl border border-[#bbf7d0] bg-white px-6 py-6 mb-8 shadow-[0_18px_40px_-28px_rgba(22,101,52,0.4)]">
        <div class="flex items-center justify-between gap-4 mb-5">
        <div class="flex items-center gap-4">
          <!-- Avatar -->
          <div class="w-12 h-12 rounded-full bg-[#166534] flex items-center justify-center text-white text-lg font-bold shrink-0">
            {{ member?.firstName?.[0]?.toUpperCase() || '?' }}
          </div>
          <div>
            <div class="font-semibold text-neutral-900 leading-snug">
              {{ member?.firstName }} {{ member?.lastName }}
            </div>
            <div class="text-sm text-neutral-500 mt-0.5">สมาชิก Nakarin Studio</div>
          </div>
        </div>

          <button
            class="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
            :disabled="loggingOut"
            @click="requestLogout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            {{ loggingOut ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ' }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
            <p class="text-xs text-neutral-500">ออเดอร์ทั้งหมด</p>
            <p class="text-lg font-bold text-[#166534] mt-1">{{ bookings.length }}</p>
          </div>
          <div class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
            <p class="text-xs text-neutral-500">ส่งสำเร็จ/เสร็จสิ้น</p>
            <p class="text-lg font-bold text-[#166534] mt-1">{{ bookings.filter(b => ['delivered', 'completed'].includes(b.status)).length }}</p>
          </div>
          <div class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
            <p class="text-xs text-neutral-500">กำลังดำเนินการ</p>
            <p class="text-lg font-bold text-[#166534] mt-1">{{ bookings.filter(b => !['delivered', 'completed', 'canceled'].includes(b.status)).length }}</p>
          </div>
        </div>
      </div>

      <!-- ── ประวัติการสั่งซื้อ ──────────────────────────────────────────── -->
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold text-neutral-900">ประวัติการสั่งบายศรี</h2>
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/orders"
            class="text-sm font-medium text-neutral-500 hover:text-[#166534] transition-colors"
          >
            ดูทั้งหมด
          </NuxtLink>
          <NuxtLink
            to="/booking"
            class="text-sm font-medium text-[#166534] hover:underline"
          >
            + สั่งใหม่
          </NuxtLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loadingBookings" class="flex justify-center py-16">
        <svg class="animate-spin h-7 w-7 text-[#166534]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- Error -->
      <div v-else-if="bookingError" class="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
        {{ bookingError }}
        <button class="ml-3 underline hover:no-underline" @click="fetchBookings">ลองอีกครั้ง</button>
      </div>

      <!-- Empty -->
      <div v-else-if="bookings.length === 0" class="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-6 py-14 text-center">
        <div class="text-3xl mb-3">🌸</div>
        <div class="text-neutral-600 font-medium">ยังไม่มีรายการสั่งซื้อ</div>
        <div class="text-sm text-neutral-400 mt-1 mb-5">เริ่มสั่งบายศรีจากที่นี่เลย</div>
        <NuxtLink
          to="/booking"
          class="inline-block rounded-xl bg-[#166534] px-6 py-2.5 text-sm font-medium text-white shadow-[0_4px_12px_-4px_rgba(22,101,52,0.5)] hover:bg-[#14532d] transition-colors"
        >
          สั่งบายศรีเลย
        </NuxtLink>
      </div>

      <!-- Booking list -->
      <div v-else class="space-y-3">
        <NuxtLink
          v-for="b in bookings"
          :key="b.id"
          :to="`/orders/${b.id}`"
          class="block rounded-2xl border border-[#bbf7d0] bg-white px-5 py-4 shadow-[0_12px_26px_-22px_rgba(22,101,52,0.45)] hover:shadow-[0_16px_34px_-20px_rgba(22,101,52,0.55)] transition-shadow"
        >
          <!-- Row 1: เลขที่ + status -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <div class="font-semibold text-neutral-900 text-sm leading-snug">
                {{ b.packageName || b.baiseeStyle || 'บายศรี' }}
              </div>
              <div class="text-xs text-neutral-400 mt-0.5"># {{ b.bookingNo }}</div>
            </div>
            <span
              class="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border"
              :class="statusColor(b.status)"
            >
              {{ statusLabel(b.status) }}
            </span>
          </div>

          <!-- Row 2: วันงาน + ราคา -->
          <div class="flex items-end justify-between gap-2 text-sm">
            <div class="space-y-0.5">
              <div v-if="b.eventDate" class="flex items-center gap-1.5 text-neutral-500 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                วันงาน {{ formatDate(b.eventDate) }}
              </div>
              <div class="flex items-center gap-1.5 text-neutral-400 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                อัพเดต {{ formatDate(b.statusUpdatedAt) }}
              </div>
            </div>

            <div class="text-right shrink-0">
              <div class="text-base font-bold text-[#166534]">{{ currency(b.totalPrice) }}</div>
              <div class="text-xs text-neutral-400">
                ชำระแล้ว {{ currency(b.paidAmount) }}
                <span v-if="b.balanceAmount > 0"> · ค้างชำระ {{ currency(b.balanceAmount) }}</span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

    </UContainer>

    <BaseModal ref="logoutConfirmModalRef" id="customer-profile-logout-confirm" title="ยืนยันการออกจากระบบ" :backdrop-close="true">
      <p class="text-sm text-neutral-600">คุณต้องการออกจากระบบตอนนี้หรือไม่?</p>
      <template #actions>
        <div class="w-full flex items-center justify-end gap-2">
          <button
            type="button"
            class="ns-ui-btn ns-ui-btn-secondary"
            @click="logoutConfirmModalRef?.close()"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            class="ns-ui-btn ns-ui-btn-danger"
            :disabled="loggingOut"
            @click="handleLogout"
          >
            ออกจากระบบ
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
