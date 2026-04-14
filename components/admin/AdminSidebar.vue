<script setup lang="ts">
const route = useRoute()

const modalRef = ref<InstanceType<typeof BaseModal> | null>(null)

const accordionItems = [
  {
    title: 'ภาพรวมระบบ',
    description: 'หน้าสรุปผลการใช้งาน',
    links: [{ label: 'แดชบอร์ด', to: '/admin/dashboard', icon: 'dashboard' }],
  },
  {
    title: 'จัดการร้านค้า',
    description: 'สินค้า หมวดหมู่ แพคเกจ ออเดอร์',
    links: [
      { label: 'จัดการสินค้า', to: '/admin/products', icon: 'products' },
      { label: 'จัดการหมวดหมู่สินค้า', to: '/admin/product-categories', icon: 'categories' },
      { label: 'จัดการแพคเกจ', to: '/admin/packages', icon: 'packages' },
      { label: 'จัดการออเดอร์', to: '/admin/bookings', icon: 'orders' },
      { label: 'คิวการผลิตรายเดือน', to: '/admin/capacity', icon: 'orders' },
      { label: 'จัดการข้อความ', to: '/admin/messages', icon: 'messages' },
    ],
  },
  {
    title: 'จัดการสิทธิ์ผู้ใช้',
    description: 'จัดสิทธิ์และดูแลทีมงาน',
    links: [
      { label: 'จัดการผู้ใช้งาน', to: '/admin/users', icon: 'users' },
      { label: 'จัดการแอดมิน', to: '/admin/admins', icon: 'admins' },
    ],
  },
]

const openLogoutModal = () => {
  modalRef.value?.open()
}

const logout = async () => {
  if (import.meta.client) {
    localStorage.removeItem('ns_admin_auth')
    sessionStorage.removeItem('ns_admin_auth')
    document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax'
    document.cookie = 'refresh_token=; Path=/; Max-Age=0; SameSite=Lax'
    document.cookie = 'accesc_token=; Path=/; Max-Age=0; SameSite=Lax'
  }

  modalRef.value?.close()
  await navigateTo('/admin/auth/login')
}
</script>

<template>
  <aside class="fixed inset-y-0 left-0 hidden md:flex w-72 flex-col border-r border-emerald-100 bg-white">
    <div class="px-6 py-5 border-b border-emerald-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-sm font-extrabold shadow-[0_10px_20px_-14px_rgba(4,120,87,0.45)]">N</div>
        <div>
          <p class="text-xs font-semibold tracking-[0.18em] text-emerald-800 uppercase">Nakarin Studio</p>
          <p class="text-[11px] text-slate-500">Admin Control Center</p>
        </div>
      </div>

      <div class="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3">
        <p class="text-[11px] uppercase tracking-[0.16em] text-emerald-800 font-semibold">แผงผู้ดูแลระบบ</p>
        <p class="text-xs text-slate-600 mt-1">จัดการข้อมูลทั้งหมดของระบบ</p>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      <section>
        <p class="px-1 text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-2">เมนูแอดมิน</p>
        <BaseAccordion :items="accordionItems" name="admin-sidebar-main" :default-open="0" />
      </section>
    </div>

    <div class="border-t border-emerald-100 p-4 bg-white">
      <button
        type="button"
        class="w-full rounded-xl border border-rose-200 bg-white py-2.5 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
        @click="openLogoutModal"
      >
        ออกจากระบบ
      </button>
    </div>

    <BaseModal ref="modalRef" id="admin-logout-confirm" title="ยืนยันการออกจากระบบ" close-label="ยกเลิก">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </div>
        <div>
          <p class="text-base font-semibold text-neutral-900">ต้องการออกจากระบบตอนนี้ใช่ไหม?</p>
          <p class="text-sm text-neutral-600 mt-1 leading-relaxed">ระบบจะยกเลิกการเข้าสู่ระบบของคุณทันที และต้องกรอกข้อมูลเพื่อเข้าสู่ระบบใหม่อีกครั้ง</p>
        </div>
      </div>

      <div class="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600">
        หากยังทำงานไม่เสร็จ แนะนำให้เลือก อยู่ต่อ
      </div>

      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn w-full rounded-xl border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200" @click="modalRef?.close()">อยู่ต่อ</button>
          <button type="button" class="btn w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-none transition-all duration-200" @click="logout">ออกจากระบบ</button>
        </div>
      </template>
    </BaseModal>
  </aside>

  <div class="md:hidden fixed bottom-4 right-4 z-40">
    <NuxtLink
      :to="route.path"
      class="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20"
    >
      Admin
    </NuxtLink>
  </div>
</template>
