<script setup lang="ts">
const isMenuOpen = ref(false)
const isDesktopNotifOpen = ref(false)
const isMobileNotifOpen = ref(false)
const isDesktopProfileOpen = ref(false)
const isMobileProfileOpen = ref(false)
const desktopNotifRef = ref<HTMLElement | null>(null)
const mobileNotifRef = ref<HTMLElement | null>(null)
const desktopProfileRef = ref<HTMLElement | null>(null)
const mobileProfileRef = ref<HTMLElement | null>(null)
const config = useRuntimeConfig()
const logoutConfirmModalRef = ref<InstanceType<typeof BaseModal> | null>(null)

type NotificationItem = { id: string; title: string; time: string; to?: string }

const notifications = ref<NotificationItem[]>([])

const navLinks = [
  { label: 'หน้าแรก', to: '/' },
  { label: 'บริการ', to: '/#products' },
  { label: 'แพคเกจ', to: '/#packages' },
  { label: 'สั่งออนไลน์', to: '/booking' },
]

type StoredSession = { member?: { id?: string; firstName?: string; lastName?: string; role?: string } }

const session = computed<StoredSession>(() => {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem('ns_auth') || sessionStorage.getItem('ns_auth')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
})

const isLoggedIn = computed(() => !!session.value?.member?.firstName)
const memberName = computed(() => {
  const m = session.value?.member
  return m ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : ''
})

const hasNotification = computed(() => notifications.value.length > 0)

const toggleDesktopNotif = () => {
  isDesktopNotifOpen.value = !isDesktopNotifOpen.value
  if (isDesktopNotifOpen.value) {
    isMobileNotifOpen.value = false
    isDesktopProfileOpen.value = false
  }
}

const toggleMobileNotif = () => {
  isMobileNotifOpen.value = !isMobileNotifOpen.value
  if (isMobileNotifOpen.value) {
    isDesktopNotifOpen.value = false
    isMobileProfileOpen.value = false
  }
}

const toggleDesktopProfile = () => {
  isDesktopProfileOpen.value = !isDesktopProfileOpen.value
  if (isDesktopProfileOpen.value) {
    isDesktopNotifOpen.value = false
    isMobileProfileOpen.value = false
  }
}

const toggleMobileProfile = () => {
  isMobileProfileOpen.value = !isMobileProfileOpen.value
  if (isMobileProfileOpen.value) {
    isMobileNotifOpen.value = false
    isDesktopProfileOpen.value = false
  }
}

const clearNotifications = () => {
  notifications.value = []
  isDesktopNotifOpen.value = false
  isMobileNotifOpen.value = false
}

const statusText: Record<string, string> = {
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  processing: 'กำลังดำเนินการ',
  in_production: 'กำลังผลิต',
  ready: 'พร้อมส่ง',
  delivered: 'จัดส่งแล้ว',
  completed: 'เสร็จสิ้น',
  canceled: 'ยกเลิก',
  cancelled: 'ยกเลิก',
  draft: 'รอดำเนินการ',
}

const formatRelative = (iso: string | null | undefined) => {
  if (!iso) return 'ล่าสุด'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 'ล่าสุด'
  const diffMin = Math.max(1, Math.floor((Date.now() - t) / 60000))
  if (diffMin < 60) return `เมื่อ ${diffMin} นาทีที่แล้ว`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `เมื่อ ${diffHour} ชั่วโมงที่แล้ว`
  const diffDay = Math.floor(diffHour / 24)
  return `เมื่อ ${diffDay} วันที่แล้ว`
}

const loadOrderNotifications = async () => {
  const memberId = session.value?.member?.id
  if (!memberId) {
    notifications.value = []
    return
  }

  try {
    const res = await $fetch<any>('/api/v1/bookings', {
      baseURL: config.public.apiBase,
      query: { memberId, size: 5 },
    })
    const rows: unknown[] = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.data) ? res.data : []
    notifications.value = rows.slice(0, 3).map((row, idx) => {
      const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
      const id = typeof r.id === 'string' ? r.id : ''
      const bookingNo = typeof r.booking_no === 'string' ? r.booking_no : '-'
      const status = typeof r.status === 'string' ? r.status : 'pending'
      const updatedAt = typeof r.status_updated_at === 'string' ? r.status_updated_at : null
      return {
        id: id || `n-${idx}`,
        title: `ออเดอร์ #${bookingNo} : ${statusText[status] || status}`,
        time: formatRelative(updatedAt),
        to: id ? `/orders/${id}` : '/orders',
      }
    })
  } catch {
    notifications.value = []
  }
}

const closeNotificationMenus = () => {
  isDesktopNotifOpen.value = false
  isMobileNotifOpen.value = false
  isDesktopProfileOpen.value = false
  isMobileProfileOpen.value = false
  isMenuOpen.value = false
}

const onClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target) return
  if (desktopNotifRef.value && !desktopNotifRef.value.contains(target)) isDesktopNotifOpen.value = false
  if (mobileNotifRef.value && !mobileNotifRef.value.contains(target)) isMobileNotifOpen.value = false
  if (desktopProfileRef.value && !desktopProfileRef.value.contains(target)) isDesktopProfileOpen.value = false
  if (mobileProfileRef.value && !mobileProfileRef.value.contains(target)) isMobileProfileOpen.value = false
}

const requestLogout = () => {
  isMenuOpen.value = false
  isDesktopNotifOpen.value = false
  isMobileNotifOpen.value = false
  isDesktopProfileOpen.value = false
  isMobileProfileOpen.value = false
  logoutConfirmModalRef.value?.open()
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  loadOrderNotifications()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})

const logout = () => {
  if (!import.meta.client) return
  logoutConfirmModalRef.value?.close()
  isDesktopNotifOpen.value = false
  isMobileNotifOpen.value = false
  isDesktopProfileOpen.value = false
  isMobileProfileOpen.value = false
  localStorage.removeItem('ns_auth')
  sessionStorage.removeItem('ns_auth')
  document.cookie = 'customer_access_token=; Path=/; Max-Age=0; SameSite=Lax'
  document.cookie = 'customer_refresh_token=; Path=/; Max-Age=0; SameSite=Lax'
  navigateTo('/')
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 border-b border-[#bbf7d0] bg-white/95 backdrop-blur shadow-[0_1px_8px_-2px_rgba(22,101,52,0.08)]">
    <UContainer>
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#166534] text-white flex items-center justify-center text-sm font-extrabold shadow-[0_6px_14px_-6px_rgba(22,101,52,0.7)]">N</div>
          <span class="font-bold text-sm tracking-wide text-[#166534] uppercase">Nakarin Studio</span>
        </NuxtLink>

        <!-- Desktop Nav -->
        <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          <template v-for="link in navLinks" :key="link.to">
            <NuxtLink
              v-if="link.to.startsWith('/') && !link.to.includes('#')"
              :to="link.to"
              class="hover:text-[#166534] transition-colors"
            >
              {{ link.label }}
            </NuxtLink>
            <a
              v-else
              :href="link.to"
              class="hover:text-[#166534] transition-colors"
            >
              {{ link.label }}
            </a>
          </template>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Logged in -->
          <template v-if="isLoggedIn">
            <!-- แจ้งเตือน -->
            <div ref="desktopNotifRef" class="hidden md:block relative">
              <button
                class="relative flex items-center justify-center w-9 h-9 rounded-xl border border-[#bbf7d0] text-[#166534] hover:bg-[#f0fdf4] transition-colors"
                title="การแจ้งเตือน"
                @click.stop="toggleDesktopNotif"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-[18px] h-[18px]">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                <span v-if="hasNotification" class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
              </button>

              <div
                v-if="isDesktopNotifOpen"
                class="absolute right-0 mt-2 w-80 rounded-2xl border border-[#bbf7d0] bg-white shadow-[0_14px_30px_-18px_rgba(22,101,52,0.55)] p-3 z-50"
              >
                <div class="flex items-center justify-between pb-2 border-b border-[#ecfdf3]">
                  <p class="text-sm font-semibold text-neutral-900">การแจ้งเตือน</p>
                  <button class="text-xs text-[#166534] hover:underline" @click="clearNotifications">ล้างทั้งหมด</button>
                </div>
                <div v-if="notifications.length" class="pt-2 space-y-2 max-h-72 overflow-y-auto">
                  <template v-for="item in notifications" :key="item.id">
                    <NuxtLink
                      v-if="item.to"
                      :to="item.to"
                      class="block rounded-xl border border-[#ecfdf3] bg-[#f0fdf4] px-3 py-2 hover:bg-white transition-colors"
                      @click="closeNotificationMenus"
                    >
                      <p class="text-sm text-neutral-800 leading-snug">{{ item.title }}</p>
                      <p class="text-[11px] text-neutral-500 mt-1">{{ item.time }}</p>
                    </NuxtLink>
                    <div v-else class="rounded-xl border border-[#ecfdf3] bg-[#f0fdf4] px-3 py-2">
                      <p class="text-sm text-neutral-800 leading-snug">{{ item.title }}</p>
                      <p class="text-[11px] text-neutral-500 mt-1">{{ item.time }}</p>
                    </div>
                  </template>
                </div>
                <p v-else class="pt-3 text-sm text-neutral-400">ไม่มีการแจ้งเตือนใหม่</p>
              </div>
            </div>
            <!-- โปรไฟล์ dropdown -->
            <div ref="desktopProfileRef" class="hidden md:block relative">
              <button
                class="flex items-center justify-center w-9 h-9 rounded-xl border border-[#bbf7d0] text-[#166534] hover:bg-[#f0fdf4] transition-colors"
                :title="memberName"
                @click.stop="toggleDesktopProfile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-[18px] h-[18px]">
                  <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                </svg>
              </button>

              <div
                v-if="isDesktopProfileOpen"
                class="absolute right-0 mt-2 w-56 rounded-2xl border border-[#bbf7d0] bg-white shadow-[0_14px_30px_-18px_rgba(22,101,52,0.55)] p-2 z-50"
              >
                <NuxtLink to="/orders" class="block rounded-xl px-3 py-2 text-sm text-neutral-700 hover:bg-[#f0fdf4]" @click="closeNotificationMenus">
                  คำสั่งซื้อ
                </NuxtLink>
                <NuxtLink to="/profile" class="block rounded-xl px-3 py-2 text-sm text-neutral-700 hover:bg-[#f0fdf4]" @click="closeNotificationMenus">
                  ตั้งค่าบัญชี
                </NuxtLink>
              </div>
            </div>
            <!-- ออกจากระบบ -->
            <button
              class="hidden md:flex items-center justify-center w-9 h-9 rounded-xl border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 transition-colors"
              title="ออกจากระบบ"
              @click="requestLogout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-[18px] h-[18px]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </button>
          </template>
          <!-- Guest -->
          <template v-else>
            <NuxtLink
              to="/auth/login"
              class="hidden md:inline-flex rounded-xl border border-[#bbf7d0] px-4 py-1.5 text-sm font-medium text-[#166534] hover:bg-[#f0fdf4] transition-colors"
            >
              เข้าสู่ระบบ
            </NuxtLink>
            <NuxtLink
              to="/auth/register"
              class="hidden md:inline-flex rounded-xl bg-[#166534] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#14532d] transition-colors shadow-[0_4px_12px_-4px_rgba(22,101,52,0.5)]"
            >
              สมัครสมาชิก
            </NuxtLink>
          </template>
          <!-- Mobile menu button -->
          <button
            class="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-[#f0fdf4] transition-colors"
            @click="isMenuOpen = !isMenuOpen"
          >
            <svg v-if="!isMenuOpen" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Nav -->
      <div v-if="isMenuOpen" class="md:hidden pb-4 border-t border-[#bbf7d0] pt-3 flex flex-col gap-2">
        <a
          v-for="link in navLinks"
          :key="link.to"
          :href="link.to"
          class="px-2 py-1.5 text-sm font-medium text-neutral-700 hover:text-[#166534] transition-colors"
          @click="isMenuOpen = false"
        >
          {{ link.label }}
        </a>
        <div class="flex flex-col gap-2 pt-2 border-t border-[#bbf7d0]">
          <template v-if="isLoggedIn">
            <div class="flex items-center gap-2 px-1 pb-1" ref="mobileNotifRef">
              <div class="relative">
                <button
                  class="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#bbf7d0] text-[#166534] hover:bg-[#f0fdf4] transition-colors"
                  title="การแจ้งเตือน"
                  @click.stop="toggleMobileNotif"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-[18px] h-[18px]">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  <span v-if="hasNotification" class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
                </button>

                <div
                  v-if="isMobileNotifOpen"
                  class="absolute left-0 mt-2 w-[290px] rounded-2xl border border-[#bbf7d0] bg-white shadow-[0_14px_30px_-18px_rgba(22,101,52,0.55)] p-3 z-50"
                >
                  <div class="flex items-center justify-between pb-2 border-b border-[#ecfdf3]">
                    <p class="text-sm font-semibold text-neutral-900">การแจ้งเตือน</p>
                    <button class="text-xs text-[#166534] hover:underline" @click="clearNotifications">ล้างทั้งหมด</button>
                  </div>
                  <div v-if="notifications.length" class="pt-2 space-y-2 max-h-60 overflow-y-auto">
                    <template v-for="item in notifications" :key="`m-${item.id}`">
                      <NuxtLink
                        v-if="item.to"
                        :to="item.to"
                        class="block rounded-xl border border-[#ecfdf3] bg-[#f0fdf4] px-3 py-2 hover:bg-white transition-colors"
                        @click="closeNotificationMenus"
                      >
                        <p class="text-sm text-neutral-800 leading-snug">{{ item.title }}</p>
                        <p class="text-[11px] text-neutral-500 mt-1">{{ item.time }}</p>
                      </NuxtLink>
                      <div v-else class="rounded-xl border border-[#ecfdf3] bg-[#f0fdf4] px-3 py-2">
                        <p class="text-sm text-neutral-800 leading-snug">{{ item.title }}</p>
                        <p class="text-[11px] text-neutral-500 mt-1">{{ item.time }}</p>
                      </div>
                    </template>
                  </div>
                  <p v-else class="pt-3 text-sm text-neutral-400">ไม่มีการแจ้งเตือนใหม่</p>
                </div>
              </div>

              <div ref="mobileProfileRef" class="relative">
                <button
                  class="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#bbf7d0] text-[#166534] hover:bg-[#f0fdf4] transition-colors"
                  :title="memberName"
                  @click.stop="toggleMobileProfile"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-[18px] h-[18px]">
                    <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                  </svg>
                </button>

                <div
                  v-if="isMobileProfileOpen"
                  class="absolute left-0 mt-2 w-56 rounded-2xl border border-[#bbf7d0] bg-white shadow-[0_14px_30px_-18px_rgba(22,101,52,0.55)] p-2 z-50"
                >
                  <NuxtLink to="/orders" class="block rounded-xl px-3 py-2 text-sm text-neutral-700 hover:bg-[#f0fdf4]" @click="closeNotificationMenus">
                    คำสั่งซื้อ
                  </NuxtLink>
                  <NuxtLink to="/profile" class="block rounded-xl px-3 py-2 text-sm text-neutral-700 hover:bg-[#f0fdf4]" @click="closeNotificationMenus">
                    ตั้งค่าบัญชี
                  </NuxtLink>
                </div>
              </div>

              <button
                class="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 transition-colors"
                title="ออกจากระบบ"
                @click="requestLogout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-[18px] h-[18px]">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>

            <NuxtLink to="/booking" class="px-2 py-1.5 text-sm font-medium text-[#166534]" @click="isMenuOpen = false">สั่งบายศรี</NuxtLink>
            <NuxtLink to="/profile" class="px-2 py-1.5 text-sm font-medium text-[#166534]" @click="isMenuOpen = false">โปรไฟล์ของฉัน</NuxtLink>
            <button class="px-2 py-1.5 text-sm text-red-600 text-left" @click="requestLogout">ออกจากระบบ</button>
          </template>
          <template v-else>
            <NuxtLink to="/auth/login" class="text-center rounded-xl border border-[#bbf7d0] py-2 text-sm font-medium text-[#166534]" @click="isMenuOpen = false">เข้าสู่ระบบ</NuxtLink>
            <NuxtLink to="/auth/register" class="text-center rounded-xl bg-[#166534] py-2 text-sm font-semibold text-white" @click="isMenuOpen = false">สมัครสมาชิก</NuxtLink>
          </template>
        </div>
      </div>
    </UContainer>
  </header>

  <BaseModal ref="logoutConfirmModalRef" id="customer-header-logout-confirm" title="ยืนยันการออกจากระบบ" :backdrop-close="true">
    <p class="text-sm text-neutral-600">คุณต้องการออกจากระบบตอนนี้หรือไม่?</p>
    <template #actions>
      <div class="w-full flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          @click="logoutConfirmModalRef?.close()"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          @click="logout"
        >
          ออกจากระบบ
        </button>
      </div>
    </template>
  </BaseModal>
</template>
