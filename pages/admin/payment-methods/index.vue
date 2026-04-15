<script setup lang="ts">
import BaseModalComponent from '~/components/base/BaseModal.vue'
import type { AdminPaymentMethod, PaymentMethodChannel, PaymentCheckoutSetting } from '~/composables/useAdminPaymentMethodApi'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'จัดการช่องทางชำระเงิน - Nakarin Studio Admin' })

const { listPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, getCheckoutSetting, updateCheckoutSetting } = useAdminPaymentMethodApi()
const { authFetch } = useAdminSession()
const config = useRuntimeConfig()
const toast = useAppToast()
const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
const buildUploadProxyUrl = (storageId: string) => `${apiBase}/api/v1/uploads/${storageId}/proxy`

const loading = ref(true)
const saving = ref(false)
const savingEdit = ref(false)
const deleting = ref(false)
const uploadingCreateQR = ref(false)
const uploadingEditQR = ref(false)
const createQrFileName = ref('')
const editQrFileName = ref('')
const savingCheckoutSetting = ref(false)

const checkoutSetting = reactive<PaymentCheckoutSetting>({
  allowDeposit: true,
  allowFullPayment: true,
  defaultPayment: 'deposit',
})

const rows = ref<AdminPaymentMethod[]>([])

const createModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const editModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const deleteModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)

const editingId = ref('')
const deletingId = ref('')

const form = reactive({
  channel: 'bank' as PaymentMethodChannel,
  bankName: '',
  accountName: '',
  accountNumber: '',
  promptPayId: '',
  qrCodeUrl: '',
  sortOrder: 1,
  isActive: true,
})

const editForm = reactive({
  channel: 'bank' as PaymentMethodChannel,
  bankName: '',
  accountName: '',
  accountNumber: '',
  promptPayId: '',
  qrCodeUrl: '',
  sortOrder: 1,
  isActive: true,
})

const channelOptions = [
  { label: 'บัญชีธนาคาร', value: 'bank' },
  { label: 'พร้อมเพย์', value: 'promptpay' },
  { label: 'QR Code', value: 'qr_code' },
  { label: 'อื่นๆ', value: 'other' },
]

const channelMeta: Record<PaymentMethodChannel, { label: string; badge: string }> = {
  bank: { label: 'ธนาคาร', badge: 'border-sky-200 bg-sky-100 text-sky-700' },
  promptpay: { label: 'พร้อมเพย์', badge: 'border-violet-200 bg-violet-100 text-violet-700' },
  qr_code: { label: 'QR Code', badge: 'border-emerald-200 bg-emerald-100 text-emerald-700' },
  other: { label: 'อื่นๆ', badge: 'border-slate-300 bg-slate-200 text-slate-700' },
}

const statusOptions = [
  { label: 'ทั้งหมด', value: '' },
  { label: 'เปิดใช้งาน', value: 'true' },
  { label: 'ปิดใช้งาน', value: 'false' },
]

const query = ref('')
const statusFilter = ref('')

const nextSortOrder = computed(() => {
  if (!rows.value.length) return 1
  return Math.max(...rows.value.map(i => Number(i.sortOrder || 0))) + 1
})

const filteredRows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return rows.value.filter((item) => {
    const text = [
      item.accountName,
      item.bankName || '',
      item.accountNumber || '',
      item.promptPayId || '',
      item.channel,
    ].join(' ').toLowerCase()

    const okQuery = !q || text.includes(q)
    const okStatus = !statusFilter.value || String(item.isActive) === statusFilter.value
    return okQuery && okStatus
  })
})

const deletingName = computed(() => rows.value.find(i => i.id === deletingId.value)?.accountName || '')

const resetForm = () => {
  form.channel = 'bank'
  form.bankName = ''
  form.accountName = ''
  form.accountNumber = ''
  form.promptPayId = ''
  form.qrCodeUrl = ''
  form.sortOrder = nextSortOrder.value
  form.isActive = true
}

const normalizeByChannel = (src: {
  channel: PaymentMethodChannel
  bankName: string
  accountName: string
  accountNumber: string
  promptPayId: string
  qrCodeUrl: string
  sortOrder: number
  isActive: boolean
}) => {
  const payload = {
    channel: src.channel,
    bankName: src.channel === 'bank' ? (src.bankName.trim() || null) : null,
    accountName: src.accountName.trim(),
    accountNumber: src.channel === 'bank' ? (src.accountNumber.trim() || null) : null,
    promptPayId: src.channel === 'promptpay' ? (src.promptPayId.trim() || null) : null,
    qrCodeUrl: src.qrCodeUrl.trim() || null,
    sortOrder: Number(src.sortOrder || 0),
    isActive: src.isActive,
  }

  return payload
}

const validate = (src: {
  channel: PaymentMethodChannel
  accountName: string
  accountNumber: string
  promptPayId: string
  qrCodeUrl: string
}) => {
  if (!src.accountName.trim()) return 'กรุณากรอกชื่อบัญชี'
  if (src.channel === 'bank' && !src.accountNumber.trim()) return 'กรุณากรอกเลขบัญชี'
  if (src.channel === 'promptpay' && !src.promptPayId.trim()) return 'กรุณากรอกเลขพร้อมเพย์'
  if (src.channel === 'qr_code' && !src.qrCodeUrl.trim()) return 'กรุณากรอก QR Code URL'
  return ''
}

const load = async () => {
  loading.value = true
  try {
    const [methods, setting] = await Promise.all([
      listPaymentMethods(),
      getCheckoutSetting(),
    ])
    rows.value = methods
    checkoutSetting.allowDeposit = setting.allowDeposit
    checkoutSetting.allowFullPayment = setting.allowFullPayment
    checkoutSetting.defaultPayment = setting.defaultPayment
  } catch {
    toast.error('ไม่สามารถโหลดการตั้งค่าชำระเงินได้')
  } finally {
    loading.value = false
  }
}

const submitCheckoutSetting = async () => {
  if (!checkoutSetting.allowDeposit && !checkoutSetting.allowFullPayment) {
    toast.warning('ต้องเปิดอย่างน้อย 1 วิธีชำระเงิน')
    return
  }
  if (checkoutSetting.defaultPayment === 'deposit' && !checkoutSetting.allowDeposit) {
    toast.warning('เปิดมัดจำ 50% ก่อนตั้งให้เป็นค่าเริ่มต้น')
    return
  }
  if (checkoutSetting.defaultPayment === 'paid' && !checkoutSetting.allowFullPayment) {
    toast.warning('เปิดชำระเต็มจำนวนก่อนตั้งให้เป็นค่าเริ่มต้น')
    return
  }

  savingCheckoutSetting.value = true
  try {
    const updated = await updateCheckoutSetting({
      allowDeposit: checkoutSetting.allowDeposit,
      allowFullPayment: checkoutSetting.allowFullPayment,
      defaultPayment: checkoutSetting.defaultPayment,
    })
    checkoutSetting.allowDeposit = updated.allowDeposit
    checkoutSetting.allowFullPayment = updated.allowFullPayment
    checkoutSetting.defaultPayment = updated.defaultPayment
    toast.success('บันทึกตัวเลือกการชำระเงินเรียบร้อย')
  } catch {
    toast.error('ไม่สามารถบันทึกตัวเลือกการชำระเงินได้')
  } finally {
    savingCheckoutSetting.value = false
  }
}

const openCreate = () => {
  resetForm()
  createQrFileName.value = ''
  createModalRef.value?.open()
}

const uploadQRCodeImage = async (file: File, target: 'create' | 'edit') => {
  const isCreate = target === 'create'
  const uploadState = isCreate ? uploadingCreateQR : uploadingEditQR
  uploadState.value = true

  try {
    const fd = new FormData()
    fd.append('target', 'payment_qr')
    fd.append('file', file)

    const res = await authFetch<{ data?: { id?: string, url?: string } }>('/api/v1/uploads', {
      method: 'POST',
      body: fd,
    })

    const storageId = String(res?.data?.id || '').trim()
    if (!storageId) throw new Error('missing-upload-id')

    const finalUrl = buildUploadProxyUrl(storageId)

    if (isCreate) form.qrCodeUrl = finalUrl
    else editForm.qrCodeUrl = finalUrl

    toast.success('อัปโหลด QR Code เรียบร้อย')
  } catch {
    toast.error('ไม่สามารถอัปโหลด QR Code ได้')
  } finally {
    uploadState.value = false
  }
}

const onCreateQrChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  createQrFileName.value = file.name
  await uploadQRCodeImage(file, 'create')
  input.value = ''
}

const onEditQrChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  editQrFileName.value = file.name
  await uploadQRCodeImage(file, 'edit')
  input.value = ''
}

const submitCreate = async () => {
  const error = validate(form)
  if (error) {
    toast.warning(error)
    return
  }

  saving.value = true
  try {
    const created = await createPaymentMethod(normalizeByChannel(form))
    rows.value.push(created)
    rows.value.sort((a, b) => a.sortOrder - b.sortOrder)
    toast.success('เพิ่มช่องทางชำระเงินเรียบร้อย')
    createModalRef.value?.close()
    resetForm()
  } catch {
    toast.error('ไม่สามารถเพิ่มช่องทางชำระเงินได้')
  } finally {
    saving.value = false
  }
}

const openEdit = (item: AdminPaymentMethod) => {
  editingId.value = item.id
  editQrFileName.value = ''
  editForm.channel = item.channel
  editForm.bankName = item.bankName || ''
  editForm.accountName = item.accountName
  editForm.accountNumber = item.accountNumber || ''
  editForm.promptPayId = item.promptPayId || ''
  editForm.qrCodeUrl = item.qrCodeUrl || ''
  editForm.sortOrder = item.sortOrder
  editForm.isActive = item.isActive
  editModalRef.value?.open()
}

const submitEdit = async () => {
  if (!editingId.value) return
  const error = validate(editForm)
  if (error) {
    toast.warning(error)
    return
  }

  const idx = rows.value.findIndex(i => i.id === editingId.value)
  if (idx < 0) return

  const previous = { ...rows.value[idx] }
  const optimisticPayload = normalizeByChannel(editForm)
  rows.value[idx] = {
    ...rows.value[idx],
    ...optimisticPayload,
  }

  savingEdit.value = true
  try {
    const updated = await updatePaymentMethod(editingId.value, optimisticPayload)
    rows.value[idx] = updated
    rows.value.sort((a, b) => a.sortOrder - b.sortOrder)
    toast.success('บันทึกการแก้ไขเรียบร้อย')
    editModalRef.value?.close()
  } catch {
    rows.value[idx] = previous
    toast.error('ไม่สามารถแก้ไขช่องทางชำระเงินได้')
  } finally {
    savingEdit.value = false
  }
}

const requestDelete = (id: string) => {
  deletingId.value = id
  deleteModalRef.value?.open()
}

const submitDelete = async () => {
  if (!deletingId.value) return
  const idx = rows.value.findIndex(i => i.id === deletingId.value)
  if (idx < 0) {
    deleteModalRef.value?.close()
    return
  }

  const [removed] = rows.value.splice(idx, 1)
  deleting.value = true
  try {
    await deletePaymentMethod(deletingId.value)
    toast.success('ลบช่องทางชำระเงินเรียบร้อย')
    deleteModalRef.value?.close()
  } catch {
    rows.value.splice(idx, 0, removed)
    toast.error('ไม่สามารถลบช่องทางชำระเงินได้')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await load()
  form.sortOrder = nextSortOrder.value
})
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.17),transparent_34%),linear-gradient(132deg,#0f172a_0%,#164e63_46%,#0c4a6e_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-sky-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-cyan-200/10 blur-2xl" />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">Payment Channel Control</p>
          <h2 class="mt-2 text-2xl font-bold text-white leading-tight md:text-[30px]">จัดการช่องทางชำระเงิน</h2>
          <p class="mt-2 text-sm text-slate-200/90">กำหนดบัญชีรับเงิน, PromptPay และ QR code จากแอดมิน</p>
        </div>
        <button type="button" class="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20" @click="openCreate">
          เพิ่มช่องทาง
        </button>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,.45)] backdrop-blur-sm md:p-5">
      <div class="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
        <p class="text-sm font-semibold text-emerald-800">ตัวเลือกการชำระเงินหน้า Checkout</p>
        <div class="mt-3 flex flex-wrap items-center gap-5">
          <label class="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="checkoutSetting.allowDeposit" type="checkbox" class="h-4 w-4 accent-[#166534]" />
            อนุญาตชำระมัดจำ 50%
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="checkoutSetting.allowFullPayment" type="checkbox" class="h-4 w-4 accent-[#166534]" />
            อนุญาตชำระเต็มจำนวน
          </label>
          <button type="button" class="rounded-lg bg-[#166534] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60" :disabled="savingCheckoutSetting" @click="submitCheckoutSetting">
            {{ savingCheckoutSetting ? 'กำลังบันทึก...' : 'บันทึกตัวเลือก' }}
          </button>
        </div>
        <div class="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-3">
          <p class="text-xs font-semibold text-emerald-800">ค่าเริ่มต้นตอนลูกค้าเข้าหน้า Checkout</p>
          <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label class="cursor-pointer rounded-lg border px-3 py-2 text-sm" :class="checkoutSetting.defaultPayment === 'deposit' ? 'border-[#166534] bg-[#f0fdf4]' : 'border-neutral-200 bg-white'">
              <input v-model="checkoutSetting.defaultPayment" type="radio" value="deposit" class="mr-2" :disabled="!checkoutSetting.allowDeposit" />
              Preselect มัดจำ 50%
            </label>
            <label class="cursor-pointer rounded-lg border px-3 py-2 text-sm" :class="checkoutSetting.defaultPayment === 'paid' ? 'border-[#166534] bg-[#f0fdf4]' : 'border-neutral-200 bg-white'">
              <input v-model="checkoutSetting.defaultPayment" type="radio" value="paid" class="mr-2" :disabled="!checkoutSetting.allowFullPayment" />
              Preselect เต็มจำนวน
            </label>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input v-model="query" type="text" placeholder="ค้นหาช่องทาง, บัญชี, promptpay" class="ns-admin-input" />
        <BaseSelectDropdown v-model="statusFilter" :options="statusOptions" placeholder="เลือกสถานะ" button-class="border-slate-300" />
        <button type="button" class="ns-admin-btn ns-admin-btn-secondary" @click="load">รีเฟรชข้อมูล</button>
      </div>
    </div>

    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50/50 px-4 py-3">
        <p class="text-sm font-semibold text-slate-800">รายการช่องทางชำระเงิน</p>
        <p class="text-xs text-slate-500">ทั้งหมด {{ filteredRows.length.toLocaleString('th-TH') }} รายการ</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50/90 text-slate-700">
            <tr>
              <th class="text-left px-4 py-3 font-semibold">ช่องทาง</th>
              <th class="text-left px-4 py-3 font-semibold">รายละเอียด</th>
              <th class="text-left px-4 py-3 font-semibold">QR</th>
              <th class="text-right px-4 py-3 font-semibold">ลำดับ</th>
              <th class="text-center px-4 py-3 font-semibold">สถานะ</th>
              <th class="text-right px-4 py-3 font-semibold">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td>
            </tr>
            <tr v-else-if="!filteredRows.length">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">ไม่พบข้อมูลช่องทางชำระเงิน</td>
            </tr>
            <tr v-for="item in filteredRows" :key="item.id" class="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold" :class="channelMeta[item.channel].badge">
                  {{ channelMeta[item.channel].label }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-700">
                <p class="font-semibold">{{ item.accountName }}</p>
                <p v-if="item.bankName" class="text-xs text-slate-500">{{ item.bankName }}</p>
                <p v-if="item.accountNumber" class="text-xs text-slate-500">เลขบัญชี: {{ item.accountNumber }}</p>
                <p v-if="item.promptPayId" class="text-xs text-slate-500">เลขพร้อมเพย์: {{ item.promptPayId }}</p>
              </td>
              <td class="px-4 py-3">
                <img v-if="item.qrCodeUrl" :src="item.qrCodeUrl" alt="QR" class="h-14 w-14 rounded-md border border-slate-200 object-cover" loading="lazy" />
                <span v-else class="text-xs text-slate-400">-</span>
              </td>
              <td class="px-4 py-3 text-right text-slate-700">{{ item.sortOrder }}</td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold" :class="item.isActive ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-300 bg-slate-200 text-slate-700'">
                  {{ item.isActive ? 'ใช้งาน' : 'ปิดใช้งาน' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button type="button" class="ns-admin-icon-btn" title="แก้ไข" @click="openEdit(item)">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                  </button>
                  <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100" title="ลบ" @click="requestDelete(item.id)">
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
    </div>

    <BaseModal ref="createModalRef" id="create-payment-method-modal" title="เพิ่มช่องทางชำระเงิน" close-label="ปิด">
      <div class="grid grid-cols-1 gap-3 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/70 via-white to-sky-50/40 p-3 md:grid-cols-2 md:p-4">
        <div>
          <label class="text-xs font-semibold text-neutral-600">ช่องทาง</label>
          <div class="mt-1">
            <BaseSelectDropdown v-model="form.channel" :options="channelOptions" />
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อบัญชี</label>
          <input v-model="form.accountName" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div v-if="form.channel === 'bank'">
          <label class="text-xs font-semibold text-neutral-600">ชื่อธนาคาร</label>
          <input v-model="form.bankName" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div v-if="form.channel === 'bank'">
          <label class="text-xs font-semibold text-neutral-600">เลขบัญชี</label>
          <input v-model="form.accountNumber" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div v-if="form.channel === 'promptpay'" class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">เลขพร้อมเพย์</label>
          <input v-model="form.promptPayId" type="text" placeholder="0812345678" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">ไฟล์ QR Code</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#166534] file:px-3 file:py-1.5 file:text-white" @change="onCreateQrChange" />
          <p v-if="uploadingCreateQR" class="mt-1 text-xs text-sky-700">กำลังอัปโหลดรูป QR...</p>
          <p v-else-if="createQrFileName" class="mt-1 text-xs text-neutral-500">ไฟล์ที่เลือก: {{ createQrFileName }}</p>
          <p v-if="form.qrCodeUrl" class="mt-1 text-xs text-neutral-500 break-all">URL: {{ form.qrCodeUrl }}</p>
          <img v-if="form.qrCodeUrl" :src="form.qrCodeUrl" alt="QR Preview" class="mt-2 h-28 w-28 rounded-md border border-slate-200 object-cover" />
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ลำดับการแสดงผล</label>
          <input v-model.number="form.sortOrder" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div class="flex items-end">
          <label class="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-[#166534]" />
            เปิดใช้งานทันที
          </label>
        </div>
      </div>

      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn rounded-xl border border-slate-300 bg-white text-slate-700" @click="createModalRef?.close()">ยกเลิก</button>
          <button type="button" class="btn rounded-xl bg-[#166534] text-white" :disabled="saving || uploadingCreateQR" @click="submitCreate">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="editModalRef" id="edit-payment-method-modal" title="แก้ไขช่องทางชำระเงิน" close-label="ปิด">
      <div class="grid grid-cols-1 gap-3 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-cyan-50/40 p-3 md:grid-cols-2 md:p-4">
        <div>
          <label class="text-xs font-semibold text-neutral-600">ช่องทาง</label>
          <div class="mt-1">
            <BaseSelectDropdown v-model="editForm.channel" :options="channelOptions" />
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อบัญชี</label>
          <input v-model="editForm.accountName" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div v-if="editForm.channel === 'bank'">
          <label class="text-xs font-semibold text-neutral-600">ชื่อธนาคาร</label>
          <input v-model="editForm.bankName" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div v-if="editForm.channel === 'bank'">
          <label class="text-xs font-semibold text-neutral-600">เลขบัญชี</label>
          <input v-model="editForm.accountNumber" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div v-if="editForm.channel === 'promptpay'" class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">เลขพร้อมเพย์</label>
          <input v-model="editForm.promptPayId" type="text" placeholder="0812345678" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">ไฟล์ QR Code</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#166534] file:px-3 file:py-1.5 file:text-white" @change="onEditQrChange" />
          <p v-if="uploadingEditQR" class="mt-1 text-xs text-sky-700">กำลังอัปโหลดรูป QR...</p>
          <p v-else-if="editQrFileName" class="mt-1 text-xs text-neutral-500">ไฟล์ที่เลือก: {{ editQrFileName }}</p>
          <p v-if="editForm.qrCodeUrl" class="mt-1 text-xs text-neutral-500 break-all">URL: {{ editForm.qrCodeUrl }}</p>
          <img v-if="editForm.qrCodeUrl" :src="editForm.qrCodeUrl" alt="QR Preview" class="mt-2 h-28 w-28 rounded-md border border-slate-200 object-cover" />
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ลำดับการแสดงผล</label>
          <input v-model.number="editForm.sortOrder" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div class="flex items-end">
          <label class="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="editForm.isActive" type="checkbox" class="h-4 w-4 accent-[#166534]" />
            เปิดใช้งาน
          </label>
        </div>
      </div>

      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn rounded-xl border border-slate-300 bg-white text-slate-700" @click="editModalRef?.close()">ยกเลิก</button>
          <button type="button" class="btn rounded-xl bg-[#166534] text-white" :disabled="savingEdit || uploadingEditQR" @click="submitEdit">
            {{ savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="deleteModalRef" id="delete-payment-method-modal" title="ยืนยันการลบ" close-label="ยกเลิก">
      <div class="space-y-2 text-sm text-neutral-700">
        <p>คุณต้องการลบช่องทางชำระเงินนี้หรือไม่?</p>
        <p class="font-semibold text-neutral-900">{{ deletingName }}</p>
      </div>
      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn rounded-xl border border-slate-300 bg-white text-slate-700" @click="deleteModalRef?.close()">ยกเลิก</button>
          <button type="button" class="btn rounded-xl bg-red-600 text-white" :disabled="deleting" @click="submitDelete">
            {{ deleting ? 'กำลังลบ...' : 'ยืนยันการลบ' }}
          </button>
        </div>
      </template>
    </BaseModal>
  </section>
</template>
