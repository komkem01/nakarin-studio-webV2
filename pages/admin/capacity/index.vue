<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'คิวการผลิตรายเดือน - Nakarin Studio Admin' })

type ApiEnvelope<T> = { data?: T }

type CapacitySegment = {
  segmentType?: string
  segmentKey?: string
  booked?: number
  capacity?: number
  available?: number
  segment_type?: string
  segment_key?: string
}

type CapacityMonth = {
  month?: string
  totalBooked?: number
  defaultCapacity?: number
  defaultRemaining?: number
  segments?: CapacitySegment[]
  total_booked?: number
  default_capacity?: number
  default_remaining?: number
}

type MonthlyCapacityResponse = {
  startMonth?: string
  months?: number
  generatedAt?: string
  items?: CapacityMonth[]
  start_month?: string
  generated_at?: string
}

const { authFetch, clearSession } = useAdminSession()

const loading = ref(false)
const refreshing = ref(false)
const errorMessage = ref('')
const months = ref(6)
const monthOptions = [
  { label: '3 เดือน', value: '3' },
  { label: '6 เดือน', value: '6' },
  { label: '12 เดือน', value: '12' },
]
const monthsSelectValue = computed({
  get: () => String(months.value),
  set: (value: string) => {
    const parsed = Number(value)
    months.value = Number.isFinite(parsed) && parsed > 0 ? parsed : 6
  },
})
const startMonth = ref(new Date().toISOString().slice(0, 7))
const generatedAt = ref('')
const rows = ref<CapacityMonth[]>([])
const now = ref(Date.now())

let timer: ReturnType<typeof setInterval> | null = null

const fmtNumber = (value: number | undefined) => Number(value || 0).toLocaleString('th-TH')

const capacityState = (available: number, capacity: number) => {
  if (capacity <= 0) return 'normal'
  if (available <= 0) return 'full'
  if (available / capacity <= 0.2) return 'near'
  return 'normal'
}

const capacityBadgeClass = (available: number, capacity: number) => {
  const state = capacityState(available, capacity)
  if (state === 'full') return 'bg-red-100 text-red-700 border-red-200'
  if (state === 'near') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

const capacityBadgeLabel = (available: number, capacity: number) => {
  const state = capacityState(available, capacity)
  if (state === 'full') return 'เต็มแล้ว'
  if (state === 'near') return 'ใกล้เต็ม'
  return 'ปกติ'
}

const labelSegmentType = (raw: string) => {
  const v = (raw || '').toLowerCase()
  if (v === 'package') return 'แพคเกจ'
  if (v === 'work_type') return 'ประเภทงาน'
  return 'ทั่วไป'
}

const labelMonth = (month: string) => {
  if (!month) return '-'
  const [year, mon] = month.split('-')
  const dt = new Date(Number(year), Number(mon) - 1, 1)
  return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

const minutesAgo = computed(() => {
  if (!generatedAt.value) return '-'
  const diff = Math.floor((now.value - new Date(generatedAt.value).getTime()) / 60000)
  if (diff <= 0) return 'อัปเดตเมื่อสักครู่'
  return `อัปเดตเมื่อ ${diff} นาทีที่แล้ว`
})

const nextRefreshIn = ref(15)
const refreshProgress = computed(() => Math.min(100, Math.max(0, ((15 - nextRefreshIn.value) / 15) * 100)))

const fetchCapacity = async (silent = false) => {
  if (silent) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  errorMessage.value = ''

  try {
    const res = await authFetch<ApiEnvelope<MonthlyCapacityResponse>>('/api/v1/reports/bookings/monthly-capacity', {
      query: {
        startMonth: startMonth.value,
        months: months.value,
      },
    })

    const data = res?.data || {}
    generatedAt.value = String(data.generatedAt || data.generated_at || '')
    rows.value = Array.isArray(data.items) ? data.items : []
  } catch (error) {
    const e = error as { statusCode?: number; response?: { status?: number } }
    const status = e?.statusCode || e?.response?.status
    if (status === 401) {
      await clearSession()
      return
    }
    errorMessage.value = 'ไม่สามารถโหลดข้อมูลคิวการผลิตรายเดือนได้'
  } finally {
    if (silent) {
      refreshing.value = false
    } else {
      loading.value = false
    }
  }
}

const onApplyFilter = async () => {
  await fetchCapacity(false)
  nextRefreshIn.value = 15
}

onMounted(async () => {
  await fetchCapacity(false)

  timer = setInterval(async () => {
    now.value = Date.now()
    if (nextRefreshIn.value > 1) {
      nextRefreshIn.value -= 1
      return
    }
    nextRefreshIn.value = 15
    await fetchCapacity(true)
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_12%_22%,rgba(255,255,255,.18),transparent_32%),linear-gradient(135deg,#0f172a_0%,#1e293b_44%,#0b1324_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-14 left-1/3 h-36 w-36 rounded-full bg-sky-200/10 blur-2xl" />
      <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">Realtime Queue</p>
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <h2 class="text-2xl font-bold leading-tight md:text-[30px]">คิวคงเหลือรายเดือน</h2>
        <span class="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          อัปเดตทุก 15 วินาที
        </span>
      </div>
      <p class="mt-2 max-w-3xl text-sm text-slate-200/90">ติดตามโควต้ารายเดือนแบบแยกแพคเกจหรือประเภทงาน พร้อมสัญญาณเตือนเมื่อคิวใกล้เต็ม</p>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,.45)] backdrop-blur-sm md:p-5">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label class="form-control w-full">
          <span class="label-text text-xs text-slate-500">เดือนเริ่มต้น</span>
          <input v-model="startMonth" type="month" class="input input-bordered ns-admin-input focus:outline-none" />
        </label>

        <label class="form-control w-full">
          <span class="label-text text-xs text-slate-500">จำนวนเดือน</span>
          <BaseSelectDropdown
            v-model="monthsSelectValue"
            :options="monthOptions"
            :disabled="loading"
            button-class="border-slate-300"
          />
        </label>

        <div class="md:col-span-2 flex flex-wrap items-center gap-2 md:justify-end">
          <button type="button" class="btn ns-admin-btn ns-admin-btn-primary border-none" :disabled="loading" @click="onApplyFilter">
            {{ loading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล' }}
          </button>
          <div class="min-w-[190px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <div class="mb-1 flex items-center justify-between">
              <span class="inline-flex items-center gap-1">
                <span class="h-2 w-2 rounded-full" :class="refreshing ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'" />
                รีเฟรชอัตโนมัติ
              </span>
              <span>{{ nextRefreshIn }} วิ</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500" :style="{ width: `${refreshProgress}%` }" />
            </div>
          </div>
        </div>
      </div>

      <p class="mt-3 text-xs text-slate-500">{{ minutesAgo }}</p>
    </div>

    <div v-if="errorMessage" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <TransitionGroup name="capacity-list" tag="div" class="space-y-4">
      <div v-for="item in rows" :key="item.month" class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)] transition-shadow duration-300 hover:shadow-[0_22px_50px_-38px_rgba(15,23,42,.52)]">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 bg-gradient-to-r from-slate-50 to-sky-50/50">
          <h3 class="text-base font-semibold text-slate-900">{{ labelMonth(String(item.month || '')) }}</h3>
          <div class="flex items-center gap-3 text-sm">
            <span class="text-slate-600">จองแล้วรวม: <b class="text-slate-900">{{ fmtNumber(item.totalBooked ?? item.total_booked) }}</b></span>
            <span class="text-slate-600">คิวรวมคงเหลือ: <b class="text-emerald-700">{{ fmtNumber(item.defaultRemaining ?? item.default_remaining) }}</b></span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead class="bg-slate-50/90 text-slate-700">
              <tr>
                <th>ประเภท</th>
                <th>ชื่อกลุ่ม</th>
                <th class="text-right">จองแล้ว</th>
                <th class="text-right">โควต้า</th>
                <th class="text-right">คงเหลือ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="seg in (item.segments || [])" :key="`${seg.segmentKey || seg.segment_key}-${seg.segmentType || seg.segment_type}`" class="transition-colors hover:bg-slate-50/70">
                <td>{{ labelSegmentType(String(seg.segmentType || seg.segment_type || '')) }}</td>
                <td class="font-medium text-slate-800">{{ String(seg.segmentKey || seg.segment_key || '-') }}</td>
                <td class="text-right">{{ fmtNumber(seg.booked) }}</td>
                <td class="text-right">{{ fmtNumber(seg.capacity) }}</td>
                <td class="text-right">
                  <span :class="Number(seg.available || 0) <= 0 ? 'text-red-600 font-semibold' : capacityState(Number(seg.available || 0), Number(seg.capacity || 0)) === 'near' ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'">
                    {{ fmtNumber(seg.available) }}
                  </span>
                  <span
                    class="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                    :class="capacityBadgeClass(Number(seg.available || 0), Number(seg.capacity || 0))"
                  >
                    {{ capacityBadgeLabel(Number(seg.available || 0), Number(seg.capacity || 0)) }}
                  </span>
                </td>
              </tr>
              <tr v-if="!(item.segments || []).length">
                <td colspan="5" class="py-7 text-center text-slate-500">ยังไม่ได้ตั้งโควต้าแยกตามแพคเกจหรือประเภทงาน</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </TransitionGroup>

      <div v-if="!rows.length && !loading" class="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 text-center">
        ไม่พบข้อมูลคิวในช่วงเวลาที่เลือก
      </div>
  </section>
</template>

<style scoped>
.capacity-list-enter-active,
.capacity-list-leave-active {
  transition: all 220ms ease;
}

.capacity-list-enter-from,
.capacity-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
