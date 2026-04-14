<script setup lang="ts">
import type { BookingStatus, PaymentType, BookingRow } from '~/composables/useAdminOrderApi'
import BaseModalComponent from '~/components/base/BaseModal.vue'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'จัดการออเดอร์ (Bookings) - Nakarin Studio Admin' })

const { listBookings, deleteBooking } = useAdminOrderApi()
const toast = useAppToast()

const loading = ref(true)
const deleting = ref(false)

const orders = ref<BookingRow[]>([])
const deletingId = ref('')
const deletingOrderNo = ref('')
const deleteModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)

const filters = reactive({
  q: '',
  status: '',
  payment: '',
  page: 1,
  size: 15,
})

const meta = reactive({ total: 0, page: 1, size: 15, totalPages: 0 })

const statusOptions: { value: BookingStatus | ''; label: string }[] = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'draft', label: 'แบบร่าง' },
  { value: 'confirmed', label: 'ยืนยันแล้ว' },
  { value: 'in_production', label: 'กำลังผลิต' },
  { value: 'ready', label: 'พร้อมส่ง' },
  { value: 'delivered', label: 'ส่งแล้ว' },
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'processing', label: 'กำลังดำเนินการ' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'canceled', label: 'ยกเลิก' },
]

const statusFilterOptions = computed(() => statusOptions.map(opt => ({ label: opt.label, value: String(opt.value) })))
const paymentFilterOptions = [
  { label: 'ทุกการชำระ', value: '' },
  { label: 'มัดจำ', value: 'deposit' },
  { label: 'ชำระครบ', value: 'paid' },
]

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft:         { label: 'แบบร่าง',         cls: 'bg-neutral-100 text-neutral-600' },
  confirmed:     { label: 'ยืนยันแล้ว',       cls: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'กำลังผลิต',        cls: 'bg-amber-100 text-amber-700' },
  ready:         { label: 'พร้อมส่ง',         cls: 'bg-teal-100 text-teal-700' },
  delivered:     { label: 'ส่งแล้ว',          cls: 'bg-indigo-100 text-indigo-700' },
  pending:       { label: 'รอดำเนินการ',       cls: 'bg-yellow-100 text-yellow-700' },
  processing:    { label: 'กำลังดำเนินการ',   cls: 'bg-purple-100 text-purple-700' },
  completed:     { label: 'เสร็จสิ้น',        cls: 'bg-emerald-100 text-emerald-700' },
  canceled:      { label: 'ยกเลิก',           cls: 'bg-red-100 text-red-600' },
}

const paymentConfig: Record<string, { label: string; cls: string }> = {
  deposit: { label: 'มัดจำ', cls: 'bg-orange-100 text-orange-700' },
  paid:    { label: 'ชำระครบ', cls: 'bg-emerald-100 text-emerald-700' },
}

const formatPrice = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const formatDate = (s: string | null) => {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

const load = async () => {
  loading.value = true
  try {
    const res = await listBookings({
      page: filters.page,
      size: filters.size,
      status: filters.status || undefined,
      payment: filters.payment || undefined,
      q: filters.q || undefined,
    })
    orders.value = res.items
    Object.assign(meta, res.meta)
  } catch {
    toast.error('ไม่สามารถโหลดข้อมูลออเดอร์ได้')
  } finally {
    loading.value = false
  }
}

const onSearch = () => { filters.page = 1; load() }
const onPageChange = (p: number) => { filters.page = p; load() }

const openDelete = (id: string) => {
  deletingId.value = id
  deletingOrderNo.value = orders.value.find(o => o.id === id)?.bookingNo ?? ''
  deleteModalRef.value?.open()
}

const confirmDelete = async () => {
  deleting.value = true
  try {
    await deleteBooking(deletingId.value)
    toast.success('ลบออเดอร์เรียบร้อย')
    deleteModalRef.value?.close()
    load()
  } catch {
    toast.error('ไม่สามารถลบออเดอร์ได้')
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.17),transparent_34%),linear-gradient(132deg,#0f172a_0%,#3f1f2f_46%,#2d1020_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-pink-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-rose-200/10 blur-2xl" />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">Order Control</p>
          <h1 class="mt-2 text-2xl font-bold text-white leading-tight md:text-[30px]">จัดการออเดอร์</h1>
          <p class="mt-2 text-sm text-slate-200/90">ตรวจสอบสถานะงาน กรองรายการ และจัดการออเดอร์จากศูนย์กลาง</p>
        </div>
        <span class="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          ทั้งหมด {{ meta.total }} รายการ
        </span>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,.45)] backdrop-blur-sm md:p-5">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          v-model="filters.q"
          type="text"
          placeholder="ค้นหาเลขออเดอร์..."
          class="ns-admin-input h-10 md:col-span-2"
          @keyup.enter="onSearch"
        />
        <BaseSelectDropdown v-model="filters.status" :options="statusFilterOptions" button-class="border-slate-300" />
        <BaseSelectDropdown v-model="filters.payment" :options="paymentFilterOptions" button-class="border-slate-300" />
      </div>
      <div class="mt-3 flex justify-end">
        <button type="button" class="ns-admin-btn ns-admin-btn-secondary" @click="onSearch">
          ค้นหา
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-rose-50/50 px-4 py-3">
        <p class="text-sm font-semibold text-slate-800">รายการออเดอร์</p>
        <p class="text-xs text-slate-500">หน้า {{ meta.page }} / {{ meta.totalPages || 1 }}</p>
      </div>
      <div v-if="loading" class="flex items-center justify-center py-20">
        <span class="loading loading-spinner loading-md text-[#16a34a]" />
      </div>
      <div v-else-if="orders.length === 0" class="flex flex-col items-center justify-center py-20 gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm text-slate-400">ไม่พบออเดอร์</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50/90">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">เลขออเดอร์</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">สถานะ</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">การชำระ</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">แพคเกจ</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">วันงาน</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">ยอดรวม</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">คงเหลือ</th>
              <th class="w-24 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="order in orders"
              :key="order.id"
              class="transition-colors hover:bg-slate-50/70"
            >
              <td class="px-4 py-3">
                <NuxtLink
                  :to="`/admin/bookings/${order.id}`"
                  class="font-mono font-semibold text-[#15803d] hover:underline"
                >
                  {{ order.bookingNo }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="statusConfig[order.status]?.cls ?? 'bg-neutral-100 text-neutral-600'"
                >
                  {{ statusConfig[order.status]?.label ?? order.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="paymentConfig[order.payment]?.cls ?? 'bg-neutral-100 text-neutral-600'"
                >
                  {{ paymentConfig[order.payment]?.label ?? order.payment }}
                </span>
              </td>
              <td class="max-w-[160px] truncate px-4 py-3 text-slate-700">{{ order.packageName ?? '-' }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-slate-600">{{ formatDate(order.eventDate) }}</td>
              <td class="px-4 py-3 text-right font-medium text-slate-900">฿{{ formatPrice(order.totalPrice) }}</td>
              <td class="px-4 py-3 text-right" :class="order.balanceAmount > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-medium'">
                ฿{{ formatPrice(order.balanceAmount) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <NuxtLink
                    :to="`/admin/bookings/${order.id}`"
                    class="ns-admin-icon-btn"
                    title="ดูรายละเอียด"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </NuxtLink>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                    title="ลบออเดอร์"
                    @click="openDelete(order.id)"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && meta.totalPages > 1" class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <p class="text-xs text-slate-500">
          หน้า {{ meta.page }} / {{ meta.totalPages }} ({{ meta.total }} รายการ)
        </p>
        <BasePagination :current="meta.page" :total="meta.totalPages" @change="onPageChange" />
      </div>
    </div>

    <!-- Delete Modal -->
    <BaseModal ref="deleteModalRef" id="delete-order-modal" title="ยืนยันการลบออเดอร์" close-label="ปิด">
      <div class="space-y-2 text-sm text-neutral-700">
        <p>คุณกำลังจะลบออเดอร์ <span class="font-semibold text-neutral-900">{{ deletingOrderNo || 'รายการนี้' }}</span></p>
        <p class="text-red-600">เมื่อลบแล้วจะไม่สามารถกู้คืนได้</p>
      </div>
      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn ns-admin-btn ns-admin-btn-secondary" @click="deleteModalRef?.close()">ยกเลิก</button>
          <button type="button" class="btn rounded-xl bg-red-600 hover:bg-red-700 text-white border-none" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'กำลังลบ...' : 'ยืนยันการลบ' }}
          </button>
        </div>
      </template>
    </BaseModal>
  </section>
</template>
