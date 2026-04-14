<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'ตั้งค่า - Nakarin Studio Admin' })

const { authFetch, clearSession } = useAdminSession()
const toast = useAppToast()

// ─── System overview ──────────────────────────────────────────────────────────

type ApiEnv<T> = { data?: T }
type OverviewData = {
  members_count?: number
  member_accounts_count?: number
  bookings_count?: number
  products_count?: number
  promotions_count?: number
  categories_count?: number
  generated_at?: string
}

const overview = ref<OverviewData>({})
const loadingOverview = ref(true)

type CapacitySettingsData = {
  dailySchedule?: number
  monthlyEventDefault?: number
  monthlyByPackage?: string
  monthlyByWorkType?: string
  updatedAt?: string
  daily_schedule?: number
  monthly_event_default?: number
  monthly_by_package?: string
  monthly_by_work_type?: string
  updated_at?: string
}

const loadingCapacitySettings = ref(true)
const savingCapacitySettings = ref(false)
const capacitySettingsError = ref('')
const capacitySettingsUpdatedAt = ref('')

const capacityForm = reactive({
  dailySchedule: 20,
  monthlyEventDefault: 300,
  monthlyByPackage: '',
  monthlyByWorkType: '',
})

const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})
const pickNumber = (source: unknown, camel: string, snake: string, fallback: number) => {
  const data = asRecord(source)
  const value = Number(data[camel] ?? data[snake])
  return Number.isFinite(value) && value > 0 ? value : fallback
}
const pickString = (source: unknown, camel: string, snake: string) => {
  const data = asRecord(source)
  const value = data[camel] ?? data[snake]
  return typeof value === 'string' ? value : ''
}

const loadOverview = async () => {
  loadingOverview.value = true
  try {
    const res = await authFetch<ApiEnv<OverviewData>>('/api/v1/reports/overview')
    overview.value = res?.data ?? {}
  } catch {
    // non-critical, show dashes
  } finally {
    loadingOverview.value = false
  }
}

const loadCapacitySettings = async () => {
  loadingCapacitySettings.value = true
  capacitySettingsError.value = ''
  try {
    const res = await authFetch<ApiEnv<CapacitySettingsData>>('/api/v1/reports/bookings/monthly-capacity/settings')
    const data = res?.data || {}
    capacityForm.dailySchedule = pickNumber(data, 'dailySchedule', 'daily_schedule', 20)
    capacityForm.monthlyEventDefault = pickNumber(data, 'monthlyEventDefault', 'monthly_event_default', 300)
    capacityForm.monthlyByPackage = pickString(data, 'monthlyByPackage', 'monthly_by_package')
    capacityForm.monthlyByWorkType = pickString(data, 'monthlyByWorkType', 'monthly_by_work_type')
    capacitySettingsUpdatedAt.value = pickString(data, 'updatedAt', 'updated_at')
  } catch (error) {
    const e = error as { statusCode?: number; response?: { status?: number } }
    const status = e?.statusCode || e?.response?.status
    if (status === 401) {
      await clearSession()
      return
    }
    capacitySettingsError.value = 'ไม่สามารถโหลดค่าโควต้าปัจจุบันได้'
  } finally {
    loadingCapacitySettings.value = false
  }
}

const saveCapacitySettings = async () => {
  if (capacityForm.dailySchedule <= 0 || capacityForm.monthlyEventDefault <= 0) {
    toast.warning('ค่าโควต้าต้องมากกว่า 0')
    return
  }

  savingCapacitySettings.value = true
  capacitySettingsError.value = ''
  try {
    const res = await authFetch<ApiEnv<CapacitySettingsData>>('/api/v1/reports/bookings/monthly-capacity/settings', {
      method: 'PUT',
      body: {
        dailySchedule: Number(capacityForm.dailySchedule),
        monthlyEventDefault: Number(capacityForm.monthlyEventDefault),
        monthlyByPackage: String(capacityForm.monthlyByPackage || ''),
        monthlyByWorkType: String(capacityForm.monthlyByWorkType || ''),
      },
    })
    const data = res?.data || {}
    capacitySettingsUpdatedAt.value = pickString(data, 'updatedAt', 'updated_at')
    toast.success('บันทึกค่าโควต้าเรียบร้อย')
  } catch (error) {
    const e = error as { statusCode?: number; response?: { status?: number } }
    const status = e?.statusCode || e?.response?.status
    if (status === 401) {
      await clearSession()
      return
    }
    toast.error('บันทึกค่าโควต้าไม่สำเร็จ')
  } finally {
    savingCapacitySettings.value = false
  }
}

const formatDate = (s: string | undefined) =>
  s ? new Date(s).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

onMounted(async () => {
  await Promise.all([loadOverview(), loadCapacitySettings()])
})

// ─── Logout ───────────────────────────────────────────────────────────────────

const loggingOut = ref(false)

const handleLogout = async () => {
  loggingOut.value = true
  try {
    await authFetch('/api/v1/auth/logout', { method: 'POST' })
  } catch {
    // ignore logout errors
  }
  await clearSession()
}

// ─── Session info ─────────────────────────────────────────────────────────────

type StoredSession = { member?: { id: string; firstName: string; lastName: string; role: string } }

const sessionInfo = computed<StoredSession>(() => {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem('ns_admin_auth') || sessionStorage.getItem('ns_admin_auth')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
})
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.17),transparent_34%),linear-gradient(132deg,#0f172a_0%,#1f3f4a_46%,#0b2530_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-teal-200/10 blur-2xl" />
      <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">System Settings</p>
      <h1 class="mt-2 text-2xl font-bold text-white leading-tight md:text-[30px]">ตั้งค่าระบบ</h1>
      <p class="mt-2 text-sm text-slate-200/90">ภาพรวมระบบ การตั้งค่าโควต้า และการจัดการเซสชันแอดมิน</p>
    </div>

    <!-- System stats -->
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-neutral-900">ภาพรวมระบบ</h3>
        <span v-if="overview.generated_at" class="text-xs text-neutral-400">
          ข้อมูล ณ {{ formatDate(overview.generated_at) }}
        </span>
      </div>
      <div v-if="loadingOverview" class="flex justify-center py-6">
        <span class="loading loading-spinner loading-sm text-[#16a34a]" />
      </div>
      <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.members_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">สมาชิกทั้งหมด</p>
        </div>
        <div class="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.bookings_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">ออเดอร์ทั้งหมด</p>
        </div>
        <div class="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.products_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">สินค้าทั้งหมด</p>
        </div>
        <div class="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.categories_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">หมวดหมู่</p>
        </div>
        <div class="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.promotions_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">โปรโมชัน</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.member_accounts_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">บัญชีผู้ใช้</p>
        </div>
      </div>
    </div>

    <!-- Capacity settings -->
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <div class="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 class="text-base font-semibold text-neutral-900">ตั้งค่าโควต้าการผลิต</h3>
          <p class="text-xs text-neutral-500 mt-1">บันทึกลงฐานข้อมูลทันที ไม่ต้องแก้ env และไม่ต้อง restart</p>
        </div>
        <span v-if="capacitySettingsUpdatedAt" class="text-xs text-neutral-400">
          อัปเดตล่าสุด {{ formatDate(capacitySettingsUpdatedAt) }}
        </span>
      </div>

      <div v-if="loadingCapacitySettings" class="flex justify-center py-6">
        <span class="loading loading-spinner loading-sm text-[#16a34a]" />
      </div>

      <div v-else class="space-y-4">
        <div v-if="capacitySettingsError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ capacitySettingsError }}
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="form-control w-full">
            <span class="label-text text-xs text-neutral-500">โควต้าคิวรายวัน</span>
            <input v-model.number="capacityForm.dailySchedule" type="number" min="1" class="input input-bordered ns-admin-input" />
          </label>
          <label class="form-control w-full">
            <span class="label-text text-xs text-neutral-500">โควต้าคิวรายเดือน (ค่าเริ่มต้น)</span>
            <input v-model.number="capacityForm.monthlyEventDefault" type="number" min="1" class="input input-bordered ns-admin-input" />
          </label>
        </div>

        <label class="form-control w-full">
          <span class="label-text text-xs text-neutral-500">โควต้าแยกตามแพคเกจ (รูปแบบ key:capacity,key2:capacity)</span>
          <textarea v-model="capacityForm.monthlyByPackage" rows="3" class="ns-admin-textarea" placeholder="งานแต่ง:120,งานขึ้นบ้านใหม่:80" />
        </label>

        <label class="form-control w-full">
          <span class="label-text text-xs text-neutral-500">โควต้าแยกตามประเภทงาน (รูปแบบ key:capacity,key2:capacity)</span>
          <textarea v-model="capacityForm.monthlyByWorkType" rows="3" class="ns-admin-textarea" placeholder="บายศรีต้น:60,บายศรีปากชาม:40" />
        </label>

        <div class="flex justify-end">
          <button
            class="btn ns-admin-btn ns-admin-btn-primary border-none"
            :disabled="savingCapacitySettings"
            @click="saveCapacitySettings"
          >
            {{ savingCapacitySettings ? 'กำลังบันทึก...' : 'บันทึกค่าโควต้า' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Session info -->
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <h3 class="text-base font-semibold text-neutral-900 mb-4">ข้อมูลเซสชัน</h3>
      <div class="space-y-2 text-sm">
        <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span class="text-neutral-500">ผู้ใช้งานปัจจุบัน</span>
          <span class="font-medium text-neutral-900">
            {{ sessionInfo.member ? `${sessionInfo.member.firstName} ${sessionInfo.member.lastName}` : '-' }}
          </span>
        </div>
        <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span class="text-neutral-500">สิทธิ์การเข้าถึง</span>
          <span class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">แอดมิน</span>
        </div>
      </div>
    </div>

    <!-- Navigation shortcuts -->
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <h3 class="text-base font-semibold text-neutral-900 mb-4">ลิงก์ด่วน</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <NuxtLink
          to="/admin/profile"
          class="group flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-cyan-200 hover:bg-cyan-50"
        >
          <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-purple-700">
              <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.125-2.095.39-.31.44-.853.21-1.312C15.7 11.408 13.2 9.2 10 9.2c-3.2 0-5.7 2.208-6.535 5.293Z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-neutral-800">โปรไฟล์</p>
            <p class="text-xs text-neutral-400">ข้อมูลส่วนตัวและรหัสผ่าน</p>
          </div>
        </NuxtLink>
        <NuxtLink
          to="/admin/admins"
          class="group flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-cyan-200 hover:bg-cyan-50"
        >
          <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-blue-700">
              <path d="M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 15a4 4 0 0 0-8 0v3h8v-3ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM16 15a4 4 0 0 1 .048.048A4.001 4.001 0 0 0 18 18h2v-3a4 4 0 0 0-4-4Z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-neutral-800">จัดการแอดมิน</p>
            <p class="text-xs text-neutral-400">เพิ่มหรือลบแอดมินระบบ</p>
          </div>
        </NuxtLink>
        <NuxtLink
          to="/admin/users"
          class="group flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-cyan-200 hover:bg-cyan-50"
        >
          <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-green-700">
              <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.983A7.468 7.468 0 0 1 14.5 16Z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-neutral-800">จัดการผู้ใช้งาน</p>
            <p class="text-xs text-neutral-400">ดูรายชื่อลูกค้าทั้งหมด</p>
          </div>
        </NuxtLink>
        <NuxtLink
          to="/admin/dashboard"
          class="group flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-cyan-200 hover:bg-cyan-50"
        >
          <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-amber-700">
              <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13a1.5 1.5 0 0 0 3 0v-13A1.5 1.5 0 0 0 15.5 2ZM9.5 6A1.5 1.5 0 0 0 8 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 9.5 6ZM3.5 10A1.5 1.5 0 0 0 2 11.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 3.5 10Z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-neutral-800">แดชบอร์ด</p>
            <p class="text-xs text-neutral-400">ภาพรวมสถิติธุรกิจ</p>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Danger zone -->
    <div class="rounded-3xl border border-red-100 bg-white p-6 shadow-[0_20px_45px_-42px_rgba(15,23,42,.4)]">
      <h3 class="text-base font-semibold text-red-700 mb-1">โซนอันตราย</h3>
      <p class="text-sm text-neutral-500 mb-4">การกระทำเหล่านี้ไม่สามารถยกเลิกได้</p>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
        :disabled="loggingOut"
        @click="handleLogout"
      >
        <span v-if="loggingOut" class="loading loading-spinner loading-xs" />
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
        </svg>
        ออกจากระบบ
      </button>
    </div>
  </section>
</template>
