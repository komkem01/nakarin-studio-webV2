<script setup lang="ts">
const route = useRoute();
const { authFetch } = useAdminSession()

type AdminNotificationItem = {
  id: string
  title: string
  message: string
  bookingId?: string | null
  isRead: boolean
  createdAt: string
}

const notifications = ref<AdminNotificationItem[]>([])
const loadingNotifications = ref(false)
const notifOpen = ref(false)
const pollingTimer = ref<number | null>(null)
const notifRef = ref<HTMLElement | null>(null)
const unreadCountServer = ref(0)

const titleMap: Record<string, string> = {
  "/admin/dashboard": "แดชบอร์ด",
  "/admin/products": "จัดการสินค้า",
  "/admin/product-categories": "จัดการหมวดหมู่สินค้า",
  "/admin/packages": "จัดการแพคเกจ",
  "/admin/bookings": "จัดการออเดอร์",
  "/admin/bookings/[id]": "รายละเอียดออเดอร์",
  "/admin/reports": "รายงาน",
  "/admin/capacity": "คิวการผลิตรายเดือน",
  "/admin/messages": "จัดการข้อความ",
  "/admin/users": "จัดการผู้ใช้งาน",
  "/admin/admins": "จัดการแอดมิน",
  "/admin/profile": "โปรไฟล์ของฉัน",
  "/admin/settings": "ตั้งค่าระบบ",
};

const pageTitle = computed(() => titleMap[route.path] || "Admin");
const unreadCount = computed(() => {
  if (unreadCountServer.value > 0) return unreadCountServer.value
  return notifications.value.filter(item => !item.isRead).length
})

const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})
const pickString = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string') return value
  }
  return ''
}
const pickBool = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true
      if (value.toLowerCase() === 'false') return false
    }
  }
  return false
}
const pickNum = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = Number(source[key])
    if (Number.isFinite(value)) return value
  }
  return 0
}

const formatRelative = (iso: string) => {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 'ล่าสุด'
  const diffMin = Math.max(1, Math.floor((Date.now() - t) / 60000))
  if (diffMin < 60) return `เมื่อ ${diffMin} นาทีที่แล้ว`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `เมื่อ ${diffHour} ชั่วโมงที่แล้ว`
  const diffDay = Math.floor(diffHour / 24)
  return `เมื่อ ${diffDay} วันที่แล้ว`
}

const fetchNotifications = async () => {
  loadingNotifications.value = true
  try {
    const res = await authFetch<{ data?: { items?: unknown[], meta?: Record<string, unknown> } }>('/api/v1/notifications', {
      query: {
        targetType: 'admin',
        page: 1,
        size: 20,
        sort: 'createdAt',
        order: 'desc',
      },
    })
    const rows = Array.isArray(res?.data?.items) ? res.data.items : []
    const meta = asRecord(res?.data?.meta)
    unreadCountServer.value = Math.max(0, pickNum(meta, 'unread', 'Unread'))
    notifications.value = rows.map((raw) => {
      const row = asRecord(raw)
      return {
        id: pickString(row, 'id'),
        title: pickString(row, 'title') || 'การแจ้งเตือนใหม่',
        message: pickString(row, 'message'),
        bookingId: pickString(row, 'bookingId', 'booking_id') || null,
        isRead: pickBool(row, 'isRead', 'is_read'),
        createdAt: pickString(row, 'createdAt', 'created_at'),
      }
    })
  } catch {
    notifications.value = []
    unreadCountServer.value = 0
  } finally {
    loadingNotifications.value = false
  }
}

const markRead = async (id: string) => {
  try {
    await authFetch('/api/v1/notifications/' + id + '/read', { method: 'PATCH' })
    const target = notifications.value.find(item => item.id === id)
    if (target) target.isRead = true
    if (unreadCountServer.value > 0) unreadCountServer.value -= 1
  } catch {
    // ignore mark-read failure; list will refresh by polling
  }
}

const markAllRead = async () => {
  const pending = notifications.value.filter(item => !item.isRead)
  if (!pending.length) return
  await Promise.allSettled(pending.map(item => markRead(item.id)))
}

const toggleNotif = async () => {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) {
    await fetchNotifications()
  }
}

const onClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target) return
  if (notifRef.value && !notifRef.value.contains(target)) {
    notifOpen.value = false
  }
}

onMounted(async () => {
  await fetchNotifications()
  document.addEventListener('click', onClickOutside)
  pollingTimer.value = window.setInterval(fetchNotifications, 60000)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  if (pollingTimer.value !== null) {
    window.clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
})
</script>

<template>
  <header
    class="sticky top-0 z-30 h-16 border-b border-emerald-100/80 bg-white/90 px-4 backdrop-blur-sm sm:px-6 lg:px-8 flex items-center justify-between"
  >
    <div>
      <p
        class="text-xs font-semibold tracking-[0.14em] text-emerald-700/80 uppercase"
      >
        Admin Workspace
      </p>
      <h1 class="text-lg font-bold text-slate-900 leading-tight">
        {{ pageTitle }}
      </h1>
    </div>

    <div class="flex items-center gap-3">
      <div ref="notifRef" class="relative">
        <button
          type="button"
          class="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-white text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          aria-label="การแจ้งเตือน"
          @click="toggleNotif"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"
            />
            <path d="M9 17a3 3 0 0 0 6 0" />
          </svg>
          <span
            v-if="unreadCount > 0"
            class="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </button>

        <div
          v-if="notifOpen"
          class="absolute right-0 mt-2 z-[80] w-[360px] rounded-2xl border border-emerald-100 bg-white p-3 shadow-lg shadow-emerald-100/40"
        >
          <div class="flex items-center justify-between border-b border-emerald-100 pb-2">
            <p class="text-sm font-semibold text-slate-900">การแจ้งเตือน</p>
            <button class="text-xs font-medium text-emerald-700 hover:underline" @click="markAllRead">อ่านทั้งหมด</button>
          </div>

          <div v-if="loadingNotifications" class="py-4 text-center text-sm text-slate-500">กำลังโหลด...</div>
          <div v-else-if="notifications.length === 0" class="py-4 text-center text-sm text-slate-400">ยังไม่มีการแจ้งเตือน</div>
          <div v-else class="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
            <div
              v-for="item in notifications"
              :key="item.id"
              class="rounded-xl border px-3 py-2"
              :class="item.isRead ? 'border-slate-200 bg-white' : 'border-emerald-200 bg-emerald-50/50'"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">{{ item.title }}</p>
                  <p class="mt-0.5 line-clamp-2 text-xs text-slate-600">{{ item.message }}</p>
                  <p class="mt-1 text-[11px] text-slate-400">{{ formatRelative(item.createdAt) }}</p>
                </div>
                <button
                  v-if="!item.isRead"
                  type="button"
                  class="shrink-0 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                  @click="markRead(item.id)"
                >
                  อ่านแล้ว
                </button>
              </div>
              <NuxtLink
                v-if="item.bookingId"
                :to="`/admin/bookings/${item.bookingId}`"
                class="mt-2 inline-flex text-xs font-medium text-emerald-700 hover:underline"
                @click="notifOpen = false"
              >
                ดูออเดอร์
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <details class="dropdown dropdown-end">
        <summary
          class="list-none m-0 inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-100 bg-white px-2.5 cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50"
        >
          <span
            class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white text-xs font-bold"
            >N</span
          >
          <span class="hidden sm:block text-sm font-semibold text-slate-800"
            >Admin</span
          >
          <svg
            class="h-4 w-4 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <ul
          class="menu dropdown-content mt-2 z-[60] w-48 rounded-xl border border-emerald-100 bg-white p-2 shadow-lg shadow-emerald-100/40"
        >
          <li><NuxtLink to="/admin/profile">โปรไฟล์</NuxtLink></li>
          <li><NuxtLink to="/admin/settings">ตั้งค่า</NuxtLink></li>
        </ul>
      </details>
    </div>
  </header>
</template>
