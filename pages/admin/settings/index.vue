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

const formatDate = (s: string | undefined) =>
  s ? new Date(s).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

onMounted(loadOverview)

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
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-bold text-neutral-900">ตั้งค่าระบบ</h1>
      <p class="text-sm text-neutral-500 mt-0.5">ข้อมูลระบบและตัวเลือกทั่วไป</p>
    </div>

    <!-- System stats -->
    <div class="bg-white rounded-2xl border border-neutral-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-neutral-900">ภาพรวมระบบ</h3>
        <span v-if="overview.generated_at" class="text-xs text-neutral-400">
          ข้อมูล ณ {{ formatDate(overview.generated_at) }}
        </span>
      </div>
      <div v-if="loadingOverview" class="flex justify-center py-6">
        <span class="loading loading-spinner loading-sm text-[#16a34a]" />
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.members_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">สมาชิกทั้งหมด</p>
        </div>
        <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.bookings_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">ออเดอร์ทั้งหมด</p>
        </div>
        <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.products_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">สินค้าทั้งหมด</p>
        </div>
        <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.categories_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">หมวดหมู่</p>
        </div>
        <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.promotions_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">โปรโมชัน</p>
        </div>
        <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-center">
          <p class="text-2xl font-bold text-neutral-900">{{ overview.member_accounts_count ?? '-' }}</p>
          <p class="text-xs text-neutral-500 mt-1">บัญชีผู้ใช้</p>
        </div>
      </div>
    </div>

    <!-- Session info -->
    <div class="bg-white rounded-2xl border border-neutral-200 p-6">
      <h3 class="text-base font-semibold text-neutral-900 mb-4">ข้อมูลเซสชัน</h3>
      <div class="space-y-2 text-sm">
        <div class="flex items-center justify-between rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
          <span class="text-neutral-500">ผู้ใช้งานปัจจุบัน</span>
          <span class="font-medium text-neutral-900">
            {{ sessionInfo.member ? `${sessionInfo.member.firstName} ${sessionInfo.member.lastName}` : '-' }}
          </span>
        </div>
        <div class="flex items-center justify-between rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
          <span class="text-neutral-500">สิทธิ์การเข้าถึง</span>
          <span class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">แอดมิน</span>
        </div>
      </div>
    </div>

    <!-- Navigation shortcuts -->
    <div class="bg-white rounded-2xl border border-neutral-200 p-6">
      <h3 class="text-base font-semibold text-neutral-900 mb-4">ลิงก์ด่วน</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <NuxtLink
          to="/admin/profile"
          class="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 hover:border-[#bbf7d0] hover:bg-[#f0fdf4] transition-colors group"
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
          class="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 hover:border-[#bbf7d0] hover:bg-[#f0fdf4] transition-colors group"
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
          class="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 hover:border-[#bbf7d0] hover:bg-[#f0fdf4] transition-colors group"
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
          class="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 hover:border-[#bbf7d0] hover:bg-[#f0fdf4] transition-colors group"
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
    <div class="bg-white rounded-2xl border border-red-100 p-6">
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
  </div>
</template>
