<script setup lang="ts">
const route = useRoute()

const titleMap: Record<string, string> = {
  '/admin/dashboard': 'แดชบอร์ด',
  '/admin/products': 'จัดการสินค้า',
  '/admin/product-categories': 'จัดการหมวดหมู่สินค้า',
  '/admin/packages': 'จัดการแพคเกจ',
  '/admin/orders': 'จัดการออเดอร์',
  '/admin/messages': 'จัดการข้อความ',
  '/admin/users': 'จัดการผู้ใช้งาน',
  '/admin/admins': 'จัดการแอดมิน',
  '/admin/profile': 'โปรไฟล์ของฉัน',
  '/admin/settings': 'ตั้งค่าระบบ',
}

const pageTitle = computed(() => titleMap[route.path] || 'Admin')
</script>

<template>
  <header class="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
    <div>
      <p class="text-sm text-neutral-500">แผงควบคุม</p>
      <h1 class="text-lg font-bold text-neutral-900 leading-tight">{{ pageTitle }}</h1>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:text-[#166534] hover:border-[#bbf7d0] hover:bg-[#f0fdf4] transition-colors"
        aria-label="การแจ้งเตือน"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"/>
          <path d="M9 17a3 3 0 0 0 6 0"/>
        </svg>
        <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
      </button>

      <details class="dropdown dropdown-end">
        <summary class="list-none m-0 inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2.5 cursor-pointer hover:border-[#bbf7d0] hover:bg-[#f0fdf4] transition-colors">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#166534] text-white text-xs font-bold">N</span>
          <span class="hidden sm:block text-sm font-semibold text-neutral-800">Admin</span>
          <svg class="h-4 w-4 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </summary>
        <ul class="menu dropdown-content mt-2 z-[60] w-48 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
          <li><NuxtLink to="/admin/profile">โปรไฟล์</NuxtLink></li>
          <li><NuxtLink to="/admin/settings">ตั้งค่า</NuxtLink></li>
        </ul>
      </details>
    </div>
  </header>
</template>
