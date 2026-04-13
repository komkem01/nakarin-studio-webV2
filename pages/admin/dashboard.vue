<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'แดชบอร์ด - Nakarin Studio Admin' })

type ApiEnvelope<T> = {
  data?: T
}

type OverviewResponse = {
  membersCount?: number
  bookingsCount?: number
  productsCount?: number
}

type AnalyticsOverviewResponse = {
  totalRevenue?: number
  averageOrder?: number
  totalBookings?: number
}

type AnalyticsDailyPoint = {
  date?: string
  totalBookings?: number
  totalRevenue?: number
}

type AnalyticsDailyResponse = {
  series?: AnalyticsDailyPoint[]
}

const { authFetch, clearSession } = useAdminSession()

const loading = ref(true)
const errorMessage = ref('')

const stats = reactive({
  bookings: 0,
  members: 0,
  products: 0,
  revenue: 0,
  averageOrder: 0,
})

const series = ref<Array<{ date: string, revenue: number, bookings: number }>>([])

const currency = (value: number) => new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
}).format(value || 0)

const shortDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
}

const chartPoints = computed(() => {
  const points = series.value
  if (!points.length) return ''

  const width = 760
  const height = 220
  const left = 14
  const right = 14
  const top = 12
  const bottom = 24
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom

  const values = points.map(item => item.revenue)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)

  return points
    .map((item, index) => {
      const x = left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth)
      const normalized = (item.revenue - min) / range
      const y = top + (1 - normalized) * chartHeight
      return `${x},${y}`
    })
    .join(' ')
})

const lastUpdated = computed(() => {
  const last = series.value[series.value.length - 1]
  if (!last?.date) return '-'
  return new Date(last.date).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const topRevenueDay = computed(() => {
  if (!series.value.length) return { label: '-', value: 0 }
  const best = [...series.value].sort((a, b) => b.revenue - a.revenue)[0]
  return { label: shortDate(best.date), value: best.revenue }
})

const fetchDashboard = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const [overviewRes, analyticsRes, dailyRes] = await Promise.all([
      authFetch<ApiEnvelope<OverviewResponse>>('/api/v1/reports/overview', {
      }),
      authFetch<ApiEnvelope<AnalyticsOverviewResponse>>('/api/v1/reports/analytics/overview', {
      }),
      authFetch<ApiEnvelope<AnalyticsDailyResponse>>('/api/v1/reports/analytics/daily', {
        query: { groupBy: 'day', timezone: 'Asia/Bangkok' },
      }),
    ])

    const overview = overviewRes?.data || {}
    const analytics = analyticsRes?.data || {}
    const daily = dailyRes?.data || {}

    stats.bookings = Number(overview.bookingsCount || analytics.totalBookings || 0)
    stats.members = Number(overview.membersCount || 0)
    stats.products = Number(overview.productsCount || 0)
    stats.revenue = Number(analytics.totalRevenue || 0)
    stats.averageOrder = Number(analytics.averageOrder || 0)

    series.value = (daily.series || [])
      .map(item => ({
        date: String(item.date || ''),
        revenue: Number(item.totalRevenue || 0),
        bookings: Number(item.totalBookings || 0),
      }))
      .filter(item => item.date)
  } catch (error) {
    const e = error as { statusCode?: number, response?: { status?: number } }
    const status = e?.statusCode || e?.response?.status
    if (status === 401) {
      await clearSession()
      return
    }
    errorMessage.value = 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ในขณะนี้'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-neutral-200 bg-gradient-to-r from-[#14532d] to-[#166534] px-6 py-5 text-white shadow-[0_20px_40px_-28px_rgba(21,128,61,0.65)]">
      <p class="text-xs uppercase tracking-[0.16em] text-white/70 font-semibold">ภาพรวมธุรกิจ</p>
      <h2 class="mt-1 text-2xl font-bold">แดชบอร์ดผู้ดูแลระบบ</h2>
      <p class="mt-2 text-sm text-white/80">ข้อมูลสรุปและกราฟรายวันอัปเดตอัตโนมัติจากข้อมูลจริงของระบบ</p>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="rounded-2xl border border-neutral-200 bg-white p-4">
        <p class="text-sm text-neutral-500">ออเดอร์ทั้งหมด</p>
        <p class="text-2xl font-bold text-neutral-900 mt-1">{{ loading ? '-' : stats.bookings.toLocaleString('th-TH') }}</p>
      </div>
      <div class="rounded-2xl border border-neutral-200 bg-white p-4">
        <p class="text-sm text-neutral-500">สมาชิกทั้งหมด</p>
        <p class="text-2xl font-bold text-neutral-900 mt-1">{{ loading ? '-' : stats.members.toLocaleString('th-TH') }}</p>
      </div>
      <div class="rounded-2xl border border-neutral-200 bg-white p-4">
        <p class="text-sm text-neutral-500">สินค้าทั้งหมด</p>
        <p class="text-2xl font-bold text-neutral-900 mt-1">{{ loading ? '-' : stats.products.toLocaleString('th-TH') }}</p>
      </div>
      <div class="rounded-2xl border border-neutral-200 bg-white p-4">
        <p class="text-sm text-neutral-500">ยอดขายรวม</p>
        <p class="text-2xl font-bold text-neutral-900 mt-1">{{ loading ? '-' : currency(stats.revenue) }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div class="xl:col-span-2 rounded-2xl border border-neutral-200 bg-white p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-neutral-900">กราฟยอดขายรายวัน</h3>
            <p class="text-sm text-neutral-500 mt-1">เส้นกราฟเชื่อมจากข้อมูลจริง 30 วันล่าสุด</p>
          </div>
          <p class="text-xs text-neutral-400">อัปเดตล่าสุด: {{ lastUpdated }}</p>
        </div>

        <div class="mt-4 rounded-xl bg-[#f8fafc] border border-neutral-200 p-3">
          <svg viewBox="0 0 760 220" class="w-full h-56">
            <polyline
              v-if="chartPoints"
              :points="chartPoints"
              fill="none"
              stroke="#166534"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <text v-else x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-size="14">
              ไม่มีข้อมูลกราฟสำหรับช่วงเวลานี้
            </text>
          </svg>
        </div>
      </div>

      <div class="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <h3 class="text-base font-semibold text-neutral-900">ตัวชี้วัดสำคัญ</h3>
        <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p class="text-xs text-neutral-500">ค่าเฉลี่ยต่อออเดอร์</p>
          <p class="text-lg font-bold text-neutral-900 mt-1">{{ loading ? '-' : currency(stats.averageOrder) }}</p>
        </div>
        <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p class="text-xs text-neutral-500">วันยอดขายสูงสุด</p>
          <p class="text-lg font-bold text-neutral-900 mt-1">{{ topRevenueDay.label }}</p>
          <p class="text-sm text-[#166534] font-semibold mt-1">{{ currency(topRevenueDay.value) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
