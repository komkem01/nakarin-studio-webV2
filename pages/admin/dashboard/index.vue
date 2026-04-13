<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'แดชบอร์ด - Nakarin Studio Admin' })

type ApiEnvelope<T> = {
  data?: T
}

type OverviewResponse = {
  members_count?: number
  member_accounts_count?: number
  bookings_count?: number
  products_count?: number
  promotions_count?: number
  categories_count?: number
}

type AnalyticsOverviewResponse = {
  total_revenue?: number
  average_order?: number
  total_bookings?: number
  bookings_by_status?: { status: string; count: number }[]
}

type AnalyticsDailyPoint = {
  date?: string
  total_bookings?: number
  total_revenue?: number
  average_order?: number
  cumulative_bookings?: number
  cumulative_revenue?: number
}

type AnalyticsDailyResponse = {
  series?: AnalyticsDailyPoint[]
  generated_at?: string
}

const { authFetch, clearSession } = useAdminSession()

const loading = ref(true)
const errorMessage = ref('')
const generatedAt = ref('')

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

const shortRevenue = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}ล.`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toFixed(0)
}

const CHART = { width: 760, height: 260, left: 52, right: 14, top: 16, bottom: 40 }

const chartCoords = computed(() => {
  const pts = series.value
  if (!pts.length) return { polyline: '', dots: [] as {cx:number,cy:number}[], xLabels: [] as {x:number,label:string}[], yLines: [] as {y:number,label:string}[] }

  const cw = CHART.width - CHART.left - CHART.right
  const ch = CHART.height - CHART.top - CHART.bottom

  const revenues = pts.map(p => p.revenue)
  const minR = Math.min(...revenues)
  const maxR = Math.max(...revenues)
  const range = Math.max(maxR - minR, 1)

  const xOf = (i: number) => CHART.left + (pts.length === 1 ? cw / 2 : (i / (pts.length - 1)) * cw)
  const yOf = (v: number) => CHART.top + (1 - (v - minR) / range) * ch

  const polyline = pts.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.revenue).toFixed(1)}`).join(' ')

  const dots = pts.map((p, i) => ({ cx: xOf(i), cy: yOf(p.revenue) }))

  // X-axis: show at most 7 date labels evenly spaced
  const maxLabels = Math.min(7, pts.length)
  const step = pts.length <= maxLabels ? 1 : Math.round((pts.length - 1) / (maxLabels - 1))
  const xLabels: { x: number; label: string }[] = []
  for (let i = 0; i < pts.length - 1; i += step) {
    xLabels.push({ x: xOf(i), label: shortDate(pts[i].date) })
  }
  xLabels.push({ x: xOf(pts.length - 1), label: shortDate(pts[pts.length - 1].date) })

  // Y-axis: 4 horizontal grid lines
  const yLineCount = 4
  const yLines = Array.from({ length: yLineCount + 1 }, (_, i) => {
    const v = minR + (i / yLineCount) * range
    return { y: yOf(v), label: shortRevenue(v) }
  })

  return { polyline, dots, xLabels, yLines }
})

const lastUpdated = computed(() => {
  if (!generatedAt.value) return '-'
  return new Date(generatedAt.value).toLocaleString('th-TH', {
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

    stats.bookings = Number(overview.bookings_count || analytics.total_bookings || 0)
    stats.members = Number(overview.members_count || 0)
    stats.products = Number(overview.products_count || 0)
    stats.revenue = Number(analytics.total_revenue || 0)
    stats.averageOrder = Number(analytics.average_order || 0)

    series.value = (daily.series || [])
      .map(item => ({
        date: String(item.date || ''),
        revenue: Number(item.total_revenue || 0),
        bookings: Number(item.total_bookings || 0),
      }))
      .filter(item => item.date)
    generatedAt.value = String(daily.generated_at || '')
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
          <svg viewBox="0 0 760 260" class="w-full h-64">
            <!-- Grid lines + Y-axis labels -->
            <template v-for="(line, i) in chartCoords.yLines" :key="'y'+i">
              <line :x1="CHART.left" :y1="line.y" :x2="CHART.width - CHART.right" :y2="line.y" stroke="#e2e8f0" stroke-width="1" />
              <text :x="CHART.left - 4" :y="line.y + 4" text-anchor="end" fill="#94a3b8" font-size="9">{{ line.label }}</text>
            </template>
            <!-- Line -->
            <polyline
              v-if="chartCoords.polyline"
              :points="chartCoords.polyline"
              fill="none"
              stroke="#166534"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Dots -->
            <circle
              v-for="(dot, i) in chartCoords.dots"
              :key="'d'+i"
              :cx="dot.cx"
              :cy="dot.cy"
              r="2.5"
              fill="white"
              stroke="#166534"
              stroke-width="1.5"
            />
            <!-- X-axis labels -->
            <template v-for="(lbl, i) in chartCoords.xLabels" :key="'x'+i">
              <text :x="lbl.x" :y="CHART.height - 10" text-anchor="middle" fill="#94a3b8" font-size="9">{{ lbl.label }}</text>
            </template>
            <!-- Empty state -->
            <text v-if="!chartCoords.polyline" x="380" y="130" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-size="14">
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
