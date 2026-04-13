<script setup lang="ts">
import type { BookingRow, BookingMessageRow } from '~/composables/useAdminOrderApi'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'ข้อความ - Nakarin Studio Admin' })

const { listBookings, listBookingMessages, createBookingMessage } = useAdminOrderApi()
const toast = useAppToast()

// ─── Booking list (left panel) ───────────────────────────────────────────────

const bookings = ref<BookingRow[]>([])
const loadingBookings = ref(true)
const searchQ = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft:         { label: 'แบบร่าง',       cls: 'bg-neutral-100 text-neutral-600' },
  confirmed:     { label: 'ยืนยันแล้ว',     cls: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'กำลังผลิต',      cls: 'bg-amber-100 text-amber-700' },
  ready:         { label: 'พร้อมส่ง',       cls: 'bg-teal-100 text-teal-700' },
  delivered:     { label: 'ส่งแล้ว',        cls: 'bg-indigo-100 text-indigo-700' },
  pending:       { label: 'รอดำเนินการ',     cls: 'bg-yellow-100 text-yellow-700' },
  processing:    { label: 'กำลังดำเนินการ', cls: 'bg-purple-100 text-purple-700' },
  completed:     { label: 'เสร็จสิ้น',      cls: 'bg-emerald-100 text-emerald-700' },
  canceled:      { label: 'ยกเลิก',         cls: 'bg-red-100 text-red-600' },
}

const fetchBookings = async () => {
  loadingBookings.value = true
  try {
    const res = await listBookings({ page: page.value, size: 30, q: searchQ.value || undefined })
    bookings.value = res.items
    totalPages.value = res.meta.totalPages
    total.value = res.meta.total
  } catch {
    toast.error('ไม่สามารถโหลดรายการออเดอร์ได้')
  } finally {
    loadingBookings.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
const onSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchBookings() }, 350)
}

// ─── Message thread (right panel) ────────────────────────────────────────────

const selectedBooking = ref<BookingRow | null>(null)
const messages = ref<BookingMessageRow[]>([])
const loadingMessages = ref(false)
const msgInput = ref('')
const sending = ref(false)
const threadEl = ref<HTMLDivElement | null>(null)

const senderLabel: Record<string, { label: string; cls: string }> = {
  admin:    { label: 'แอดมิน',  cls: 'bg-[#15803d] text-white' },
  customer: { label: 'ลูกค้า',   cls: 'bg-neutral-200 text-neutral-800' },
  system:   { label: 'ระบบ',    cls: 'bg-neutral-100 text-neutral-500' },
}

const formatDateTime = (s: string) =>
  new Date(s).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const scrollToBottom = () => {
  nextTick(() => {
    if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
  })
}

const selectBooking = async (b: BookingRow) => {
  selectedBooking.value = b
  messages.value = []
  msgInput.value = ''
  loadingMessages.value = true
  try {
    messages.value = await listBookingMessages(b.id)
    scrollToBottom()
  } catch {
    toast.error('ไม่สามารถโหลดข้อความได้')
  } finally {
    loadingMessages.value = false
  }
}

const sendMessage = async () => {
  if (!msgInput.value.trim() || !selectedBooking.value) return
  sending.value = true
  try {
    const m = await createBookingMessage({
      bookingId: selectedBooking.value.id,
      senderType: 'admin',
      message: msgInput.value.trim(),
    })
    messages.value.push(m)
    msgInput.value = ''
    scrollToBottom()
  } catch {
    toast.error('ไม่สามารถส่งข้อความได้')
  } finally {
    sending.value = false
  }
}

onMounted(fetchBookings)
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-7rem)] gap-0">
    <!-- Header -->
    <div class="mb-3 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-lg font-bold text-neutral-900">ข้อความ</h1>
        <p class="text-sm text-neutral-500 mt-0.5">บันทึกและข้อความต่อออเดอร์ทั้งหมด</p>
      </div>
    </div>

    <!-- Split panel -->
    <div class="flex-1 flex gap-4 min-h-0">

      <!-- Left: Booking list -->
      <div class="w-72 shrink-0 flex flex-col bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <!-- Search -->
        <div class="p-3 border-b border-neutral-100 shrink-0">
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="absolute left-2.5 top-2 w-4 h-4 text-neutral-400 pointer-events-none">
              <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
            </svg>
            <input
              v-model="searchQ"
              type="text"
              placeholder="ค้นหาออเดอร์..."
              class="w-full h-8 pl-8 pr-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
              @input="onSearch"
            />
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto divide-y divide-neutral-50">
          <div v-if="loadingBookings" class="flex items-center justify-center py-16">
            <span class="loading loading-spinner loading-sm text-[#16a34a]" />
          </div>
          <div v-else-if="bookings.length === 0" class="flex items-center justify-center py-16">
            <p class="text-sm text-neutral-400">ไม่พบออเดอร์</p>
          </div>
          <button
            v-for="b in bookings"
            v-else
            :key="b.id"
            class="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors"
            :class="selectedBooking?.id === b.id ? 'bg-green-50 border-l-2 border-[#15803d]' : 'border-l-2 border-transparent'"
            @click="selectBooking(b)"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="font-mono text-sm font-semibold text-neutral-900 truncate">{{ b.bookingNo }}</span>
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                :class="statusConfig[b.status]?.cls ?? 'bg-neutral-100 text-neutral-600'"
              >
                {{ statusConfig[b.status]?.label ?? b.status }}
              </span>
            </div>
            <p class="text-xs text-neutral-400 truncate">{{ b.recipientName ?? b.packageName ?? '-' }}</p>
          </button>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-3 py-2 border-t border-neutral-100 shrink-0">
          <button
            class="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-40"
            :disabled="page <= 1"
            @click="page--; fetchBookings()"
          >← ก่อนหน้า</button>
          <span class="text-xs text-neutral-400">{{ page }}/{{ totalPages }}</span>
          <button
            class="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-40"
            :disabled="page >= totalPages"
            @click="page++; fetchBookings()"
          >ถัดไป →</button>
        </div>
      </div>

      <!-- Right: Thread -->
      <div class="flex-1 flex flex-col bg-white rounded-xl border border-neutral-200 overflow-hidden min-w-0">

        <!-- Empty state -->
        <div v-if="!selectedBooking" class="flex flex-col items-center justify-center flex-1 gap-3 text-neutral-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-neutral-200">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          <p class="text-sm">เลือกออเดอร์เพื่อดูข้อความ</p>
        </div>

        <template v-else>
          <!-- Thread header -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 shrink-0">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="font-mono font-bold text-neutral-900">{{ selectedBooking.bookingNo }}</span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                :class="statusConfig[selectedBooking.status]?.cls ?? 'bg-neutral-100 text-neutral-600'"
              >
                {{ statusConfig[selectedBooking.status]?.label ?? selectedBooking.status }}
              </span>
              <span v-if="selectedBooking.recipientName" class="text-sm text-neutral-500 truncate">· {{ selectedBooking.recipientName }}</span>
            </div>
            <NuxtLink
              :to="`/admin/bookings/${selectedBooking.id}`"
              class="inline-flex items-center gap-1 text-xs text-[#15803d] hover:underline shrink-0"
            >
              ดูออเดอร์
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                <path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h4a.75.75 0 0 1 0 1.5h-4Z" clip-rule="evenodd" />
                <path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd" />
              </svg>
            </NuxtLink>
          </div>

          <!-- Messages -->
          <div ref="threadEl" class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div v-if="loadingMessages" class="flex items-center justify-center py-12">
              <span class="loading loading-spinner loading-sm text-[#16a34a]" />
            </div>
            <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center py-12 gap-2 text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-neutral-200">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              <p class="text-sm">ยังไม่มีข้อความในออเดอร์นี้</p>
            </div>
            <template v-else>
              <div
                v-for="m in messages"
                :key="m.id"
                class="flex gap-2.5"
                :class="m.senderType === 'admin' ? 'flex-row-reverse' : 'flex-row'"
              >
                <!-- Avatar -->
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  :class="senderLabel[m.senderType]?.cls ?? 'bg-neutral-200 text-neutral-600'"
                >
                  {{ senderLabel[m.senderType]?.label?.charAt(0) ?? '?' }}
                </div>
                <!-- Bubble -->
                <div class="max-w-[72%]" :class="m.senderType === 'admin' ? 'items-end' : 'items-start'" style="display:flex;flex-direction:column">
                  <div
                    class="px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    :class="m.senderType === 'admin'
                      ? 'bg-[#15803d] text-white rounded-tr-sm'
                      : m.senderType === 'system'
                        ? 'bg-neutral-100 text-neutral-500 italic text-xs'
                        : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                    "
                  >{{ m.message }}</div>
                  <span class="text-[10px] text-neutral-400 mt-0.5 px-1">{{ formatDateTime(m.createdAt) }}</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Reply input -->
          <div class="px-4 py-3 border-t border-neutral-100 shrink-0">
            <div class="flex gap-2">
              <textarea
                v-model="msgInput"
                rows="2"
                placeholder="พิมพ์ข้อความ..."
                class="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <button
                class="self-end inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#15803d] text-white hover:bg-[#166534] transition-colors disabled:opacity-50 shrink-0"
                :disabled="sending || !msgInput.trim()"
                @click="sendMessage"
              >
                <span v-if="sending" class="loading loading-spinner loading-xs" />
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
                </svg>
              </button>
            </div>
            <p class="text-[10px] text-neutral-400 mt-1.5">Enter เพื่อส่ง</p>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>
