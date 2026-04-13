<script setup lang="ts">
import type { BookingStatus, PaymentType, BookingDetailRow, BookingMessageRow, BookingAttachmentRow } from '~/composables/useAdminOrderApi'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { getBooking, updateBooking, listBookingDetails, createBookingDetail, updateBookingDetail, deleteBookingDetail, listBookingMessages, createBookingMessage, listBookingAttachments, deleteBookingAttachment, verifyBookingAttachment } = useAdminOrderApi()
const { listProducts } = useAdminCatalogApi()
const { listProvinces, listDistricts, listSubDistricts, listZipcodes, getProvince, getDistrict, getSubDistrict, getZipcode } = useAddressApi()
const toast = useAppToast()

const loading = ref(true)
const saving = ref(false)
const editMode = ref(false)

const order = ref<Awaited<ReturnType<typeof getBooking>> | null>(null)

// Convert UTC ISO string → local naive datetime string (YYYY-MM-DDTHH:mm:ss)
// Needed for datetime inputs: backend returns UTC (e.g. "04:30Z") but input needs local time (e.g. "11:30")
const toLocalDatetimeInput = (s: string | null): string | null => {
  if (!s) return null
  const d = new Date(s)
  if (!isFinite(d.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

useSeoMeta({ title: computed(() => order.value ? `ออเดอร์ ${order.value.bookingNo}` : 'รายละเอียดออเดอร์') })

const form = reactive({
  bookingNo: '',
  status: 'draft' as BookingStatus,
  payment: 'deposit' as PaymentType,
  packageName: '',
  baiseeStyle: '',
  recipientName: '',
  recipientPhone: '',
  deliveryNo: '',
  deliveryVillage: '',
  deliveryStreet: '',
  deliveryProvinceId: '',
  deliveryDistrictId: '',
  deliverySubDistrictId: '',
  deliveryZipcodeId: '',
  eventDate: null as string | null,
  scheduledAt: null as string | null,
  deliveryAt: null as string | null,
  basePrice: 0,
  addonPrice: 0,
  depositAmount: 0,
  paidAmount: 0,
})

// Address resolved names for view mode
const resolvedProvinceName = ref<string | null>(null)
const resolvedDistrictName = ref<string | null>(null)
const resolvedSubDistrictName = ref<string | null>(null)
const resolvedZipcodeName = ref<string | null>(null)

// Address dropdown options for edit mode
const provinceOptions = ref<{ id: string; name: string }[]>([])
const districtOptions = ref<{ id: string; name: string }[]>([])
const subDistrictOptions = ref<{ id: string; name: string }[]>([])
const zipcodeOptions = ref<{ id: string; name: string }[]>([])

const resolveAddressNames = async (o: { deliveryProvinceId?: string | null; deliveryDistrictId?: string | null; deliverySubDistrictId?: string | null; deliveryZipcodeId?: string | null }) => {
  const [p, d, s, z] = await Promise.all([
    o.deliveryProvinceId ? getProvince(o.deliveryProvinceId) : null,
    o.deliveryDistrictId ? getDistrict(o.deliveryDistrictId) : null,
    o.deliverySubDistrictId ? getSubDistrict(o.deliverySubDistrictId) : null,
    o.deliveryZipcodeId ? getZipcode(o.deliveryZipcodeId) : null,
  ])
  resolvedProvinceName.value = p?.name ?? null
  resolvedDistrictName.value = d?.name ?? null
  resolvedSubDistrictName.value = s?.name ?? null
  resolvedZipcodeName.value = z?.name ?? null
}

const onProvinceChange = async (val?: string) => {
  if (val !== undefined) form.deliveryProvinceId = val
  form.deliveryDistrictId = ''
  form.deliverySubDistrictId = ''
  form.deliveryZipcodeId = ''
  districtOptions.value = []
  subDistrictOptions.value = []
  zipcodeOptions.value = []
  if (form.deliveryProvinceId) districtOptions.value = await listDistricts(form.deliveryProvinceId)
}

const onDistrictChange = async (val?: string) => {
  if (val !== undefined) form.deliveryDistrictId = val
  form.deliverySubDistrictId = ''
  form.deliveryZipcodeId = ''
  subDistrictOptions.value = []
  zipcodeOptions.value = []
  if (form.deliveryDistrictId) subDistrictOptions.value = await listSubDistricts(form.deliveryDistrictId)
}

const onSubDistrictChange = async (val?: string) => {
  if (val !== undefined) form.deliverySubDistrictId = val
  form.deliveryZipcodeId = ''
  zipcodeOptions.value = []
  if (form.deliverySubDistrictId) zipcodeOptions.value = await listZipcodes(form.deliverySubDistrictId)
}

// Auto-fill deliveryAt when status is changed to 'delivered'
watch(() => form.status, (newStatus) => {
  if (newStatus === 'delivered' && !form.deliveryAt) {
    form.deliveryAt = toLocalDatetimeInput(new Date().toISOString())
  }
})

// Init address dropdowns when entering edit mode
watch(editMode, async (val) => {
  if (val) {
    provinceOptions.value = await listProvinces()
    if (form.deliveryProvinceId) districtOptions.value = await listDistricts(form.deliveryProvinceId)
    if (form.deliveryDistrictId) subDistrictOptions.value = await listSubDistricts(form.deliveryDistrictId)
    if (form.deliverySubDistrictId) zipcodeOptions.value = await listZipcodes(form.deliverySubDistrictId)
  }
})

const populateForm = () => {
  if (!order.value) return
  form.bookingNo = order.value.bookingNo
  form.status = order.value.status
  form.payment = order.value.payment
  form.packageName = order.value.packageName ?? ''
  form.baiseeStyle = order.value.baiseeStyle ?? ''
  form.recipientName = order.value.recipientName ?? ''
  form.recipientPhone = order.value.recipientPhone ?? ''
  form.deliveryNo = order.value.deliveryNo ?? ''
  form.deliveryVillage = order.value.deliveryVillage ?? ''
  form.deliveryStreet = order.value.deliveryStreet ?? ''
  form.deliveryProvinceId = order.value.deliveryProvinceId ?? ''
  form.deliveryDistrictId = order.value.deliveryDistrictId ?? ''
  form.deliverySubDistrictId = order.value.deliverySubDistrictId ?? ''
  form.deliveryZipcodeId = order.value.deliveryZipcodeId ?? ''
  form.eventDate = order.value.eventDate ? order.value.eventDate.slice(0, 10) : null
  form.scheduledAt = toLocalDatetimeInput(order.value.scheduledAt)
  form.deliveryAt = toLocalDatetimeInput(order.value.deliveryAt)
  form.basePrice = order.value.basePrice
  form.addonPrice = order.value.addonPrice
  form.depositAmount = order.value.depositAmount
  form.paidAmount = order.value.paidAmount
}

const load = async () => {
  loading.value = true
  try {
    order.value = await getBooking(id)
    populateForm()
    resolveAddressNames(order.value)
  } catch {
    toast.error('ไม่พบออเดอร์ที่ต้องการ')
    router.push('/admin/bookings')
  } finally {
    loading.value = false
  }
}

const cancelEdit = () => {
  populateForm()
  editMode.value = false
}

const save = async () => {
  if (!form.bookingNo.trim()) {
    toast.warning('กรุณากรอกเลขออเดอร์')
    return
  }
  saving.value = true
  try {
    order.value = await updateBooking(id, {
      bookingNo: form.bookingNo,
      status: form.status,
      payment: form.payment,
      packageName: form.packageName || null,
      baiseeStyle: form.baiseeStyle || null,
      recipientName: form.recipientName || null,
      recipientPhone: form.recipientPhone || null,
      deliveryNo: form.deliveryNo || null,
      deliveryVillage: form.deliveryVillage || null,
      deliveryStreet: form.deliveryStreet || null,
      deliveryProvinceId: form.deliveryProvinceId || null,
      deliveryDistrictId: form.deliveryDistrictId || null,
      deliverySubDistrictId: form.deliverySubDistrictId || null,
      deliveryZipcodeId: form.deliveryZipcodeId || null,
      eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      deliveryAt: form.status === 'delivered' ? (form.deliveryAt ? new Date(form.deliveryAt).toISOString() : new Date().toISOString()) : (form.deliveryAt ? new Date(form.deliveryAt).toISOString() : null),
      basePrice: Number(form.basePrice),
      addonPrice: Number(form.addonPrice),
      depositAmount: Number(form.depositAmount),
      paidAmount: Number(form.paidAmount),
    })
    toast.success('บันทึกออเดอร์เรียบร้อย')
    editMode.value = false
    if (order.value) resolveAddressNames(order.value)
  } catch {
    toast.error('ไม่สามารถบันทึกออเดอร์ได้')
  } finally {
    saving.value = false
  }
}

const statusOptions: { value: BookingStatus; label: string }[] = [
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

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft:         { label: 'แบบร่าง',        cls: 'bg-neutral-100 text-neutral-600' },
  confirmed:     { label: 'ยืนยันแล้ว',      cls: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'กำลังผลิต',       cls: 'bg-amber-100 text-amber-700' },
  ready:         { label: 'พร้อมส่ง',        cls: 'bg-teal-100 text-teal-700' },
  delivered:     { label: 'ส่งแล้ว',         cls: 'bg-indigo-100 text-indigo-700' },
  pending:       { label: 'รอดำเนินการ',      cls: 'bg-yellow-100 text-yellow-700' },
  processing:    { label: 'กำลังดำเนินการ',  cls: 'bg-purple-100 text-purple-700' },
  completed:     { label: 'เสร็จสิ้น',       cls: 'bg-emerald-100 text-emerald-700' },
  canceled:      { label: 'ยกเลิก',          cls: 'bg-red-100 text-red-600' },
}

const formatPrice = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const formatDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'

const formatDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

// ─── Booking Details ──────────────────────────────────────────────────────────

const details = ref<BookingDetailRow[]>([])
const loadingDetails = ref(false)
const showDetailForm = ref(false)
const editingDetailId = ref<string | null>(null)
const savingDetail = ref(false)
const deletingDetailId = ref('')
const detailForm = reactive({ itemName: '', option: '', material: '', quantity: 1, unitPrice: 0, note: '' })

// Products for dropdown
type ProductOption = { id: string; name: string; price: number }
const productOptions = ref<ProductOption[]>([])
const productSearch = ref('')
const showProductDropdown = ref(false)
const productDropdownRef = ref<HTMLDivElement | null>(null)

const filteredProducts = computed(() =>
  productSearch.value.trim()
    ? productOptions.value.filter(p => p.name.toLowerCase().includes(productSearch.value.toLowerCase()))
    : productOptions.value
)

const loadProductOptions = async () => {
  if (productOptions.value.length > 0) return
  try {
    const res = await listProducts({ limit: 200, isActive: 'true' })
    productOptions.value = res.items.map(p => ({ id: p.id, name: p.name, price: p.price }))
  } catch {}
}

const selectProduct = (p: ProductOption) => {
  detailForm.itemName = p.name
  detailForm.unitPrice = p.price
  productSearch.value = p.name
  showProductDropdown.value = false
}

const onProductSearchInput = () => {
  showProductDropdown.value = true
  detailForm.itemName = productSearch.value
}

// Close dropdown on outside click
onMounted(async () => {
  const handler = (e: MouseEvent) => {
    if (productDropdownRef.value && !productDropdownRef.value.contains(e.target as Node)) {
      showProductDropdown.value = false
    }
  }
  document.addEventListener('mousedown', handler)
  onUnmounted(() => document.removeEventListener('mousedown', handler))
})

const loadDetails = async () => {
  loadingDetails.value = true
  try { details.value = await listBookingDetails(id) } catch {}
  finally { loadingDetails.value = false }
}

const openDetailAdd = () => {
  editingDetailId.value = null
  Object.assign(detailForm, { itemName: '', option: '', material: '', quantity: 1, unitPrice: 0, note: '' })
  productSearch.value = ''
  showProductDropdown.value = false
  showDetailForm.value = true
  loadProductOptions()
}

const openDetailEdit = (d: BookingDetailRow) => {
  editingDetailId.value = d.id
  Object.assign(detailForm, { itemName: d.itemName, option: d.option ?? '', material: d.material ?? '', quantity: d.quantity, unitPrice: d.unitPrice, note: d.note ?? '' })
  productSearch.value = d.itemName
  showProductDropdown.value = false
  showDetailForm.value = true
  loadProductOptions()
}

const saveDetail = async (keepOpen = false) => {
  if (!detailForm.itemName.trim() || detailForm.quantity < 1) return
  savingDetail.value = true
  try {
    const payload = { bookingId: id, itemName: detailForm.itemName, option: detailForm.option || null, material: detailForm.material || null, quantity: Number(detailForm.quantity), unitPrice: Number(detailForm.unitPrice), note: detailForm.note || null }
    if (editingDetailId.value) {
      await updateBookingDetail(editingDetailId.value, payload)
      showDetailForm.value = false
    } else {
      await createBookingDetail(payload)
      if (!keepOpen) {
        showDetailForm.value = false
      } else {
        // reset form for next item
        Object.assign(detailForm, { itemName: '', option: '', material: '', quantity: 1, unitPrice: 0, note: '' })
        productSearch.value = ''
      }
    }
    await loadDetails()
    toast.success(editingDetailId.value ? 'แก้ไขรายการเรียบร้อย' : 'เพิ่มรายการเรียบร้อย')
    if (editingDetailId.value) editingDetailId.value = null
  } catch { toast.error('ไม่สามารถบันทึกรายการได้') }
  finally { savingDetail.value = false }
}

const confirmDeleteDetail = async (detailId: string) => {
  deletingDetailId.value = detailId
  try { await deleteBookingDetail(detailId); toast.success('ลบรายการเรียบร้อย'); await loadDetails() }
  catch { toast.error('ไม่สามารถลบรายการได้') }
  finally { deletingDetailId.value = '' }
}

// ─── Booking Messages ─────────────────────────────────────────────────────────

const messages = ref<BookingMessageRow[]>([])
const loadingMessages = ref(false)
const msgInput = ref('')
const sendingMsg = ref(false)

const loadMessages = async () => {
  loadingMessages.value = true
  try { messages.value = await listBookingMessages(id) } catch {}
  finally { loadingMessages.value = false }
}

const sendMessage = async () => {
  if (!msgInput.value.trim()) return
  sendingMsg.value = true
  try {
    const m = await createBookingMessage({ bookingId: id, senderType: 'admin', message: msgInput.value.trim() })
    messages.value.push(m)
    msgInput.value = ''
  } catch { toast.error('ไม่สามารถส่งข้อความได้') }
  finally { sendingMsg.value = false }
}

// ─── Booking Attachments ──────────────────────────────────────────────────────

const attachments = ref<BookingAttachmentRow[]>([])
const loadingAttachments = ref(false)
const deletingAttachmId = ref('')
const verifyingAttachmId = ref('')

// Payment verification panel state
const paymentVerifyId = ref<string | null>(null)
const paymentVerifyForm = reactive({ payment: 'deposit' as PaymentType, paidAmount: 0 })

const attachmentTypeLabel: Record<string, { label: string; cls: string }> = {
  payment_slip: { label: 'สลิปโอนเงิน', cls: 'bg-green-100 text-green-700' },
  reference:    { label: 'อ้างอิง',      cls: 'bg-blue-100 text-blue-700' },
  contract:     { label: 'สัญญา',        cls: 'bg-purple-100 text-purple-700' },
  event_proof:  { label: 'หลักฐานงาน',   cls: 'bg-amber-100 text-amber-700' },
  other:        { label: 'อื่นๆ',        cls: 'bg-neutral-100 text-neutral-600' },
}

const loadAttachments = async () => {
  loadingAttachments.value = true
  try { attachments.value = await listBookingAttachments(id) } catch {}
  finally { loadingAttachments.value = false }
}

const doDeleteAttachment = async (attachId: string) => {
  deletingAttachmId.value = attachId
  try { await deleteBookingAttachment(attachId); attachments.value = attachments.value.filter(a => a.id !== attachId); toast.success('ลบไฟล์แนบเรียบร้อย') }
  catch { toast.error('ไม่สามารถลบไฟล์แนบได้') }
  finally { deletingAttachmId.value = '' }
}

const doVerifyAttachment = async (attachId: string) => {
  verifyingAttachmId.value = attachId
  try {
    const updated = await verifyBookingAttachment(attachId)
    const idx = attachments.value.findIndex(a => a.id === attachId)
    if (idx !== -1) attachments.value[idx] = updated
    toast.success('ยืนยันไฟล์แนบเรียบร้อย')
  } catch { toast.error('ไม่สามารถยืนยันไฟล์แนบได้') }
  finally { verifyingAttachmId.value = '' }
}

const openPaymentVerify = (a: BookingAttachmentRow) => {
  paymentVerifyForm.payment = order.value?.payment ?? 'deposit'
  paymentVerifyForm.paidAmount = order.value?.paidAmount ?? 0
  paymentVerifyId.value = a.id
}

const submitPaymentVerify = async (attachId: string) => {
  if (!order.value) return
  verifyingAttachmId.value = attachId
  try {
    // 1. Mark attachment as verified
    const updated = await verifyBookingAttachment(attachId)
    const idx = attachments.value.findIndex(a => a.id === attachId)
    if (idx !== -1) attachments.value[idx] = updated

    // 2. Update booking payment info
    order.value = await updateBooking(id, {
      bookingNo: order.value.bookingNo,
      status: order.value.status,
      payment: paymentVerifyForm.payment,
      packageName: order.value.packageName,
      baiseeStyle: order.value.baiseeStyle,
      recipientName: order.value.recipientName,
      recipientPhone: order.value.recipientPhone,
      deliveryNo: order.value.deliveryNo,
      deliveryVillage: order.value.deliveryVillage,
      deliveryStreet: order.value.deliveryStreet,
      deliveryProvinceId: order.value.deliveryProvinceId,
      deliveryDistrictId: order.value.deliveryDistrictId,
      deliverySubDistrictId: order.value.deliverySubDistrictId,
      deliveryZipcodeId: order.value.deliveryZipcodeId,
      eventDate: order.value.eventDate,
      scheduledAt: order.value.scheduledAt,
      deliveryAt: order.value.deliveryAt,
      basePrice: order.value.basePrice,
      addonPrice: order.value.addonPrice,
      depositAmount: order.value.depositAmount,
      paidAmount: Number(paymentVerifyForm.paidAmount),
    })
    populateForm()
    paymentVerifyId.value = null
    toast.success('ยืนยันการชำระเงินและอัปเดตสถานะเรียบร้อย')
  } catch { toast.error('ไม่สามารถยืนยันการชำระเงินได้') }
  finally { verifyingAttachmId.value = '' }
}

onMounted(async () => {
  await load()
  await Promise.all([loadDetails(), loadMessages(), loadAttachments()])
})
</script>

<template>
  <div>
    <!-- Back + header -->
    <div class="mb-5 flex items-center gap-3">
      <NuxtLink
        to="/admin/bookings"
        class="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" />
        </svg>
        กลับรายการออเดอร์
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-32">
      <span class="loading loading-spinner loading-lg text-[#16a34a]" />
    </div>

    <div v-else-if="order" class="space-y-4">
      <!-- Title row -->
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-xl font-bold text-neutral-900 font-mono">{{ order.bookingNo }}</h1>
          <span
            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
            :class="statusConfig[order.status]?.cls ?? 'bg-neutral-100 text-neutral-600'"
          >
            {{ statusConfig[order.status]?.label ?? order.status }}
          </span>
          <span class="text-xs text-neutral-400">อัปเดตสถานะ {{ formatDate(order.statusUpdatedAt) }}</span>
        </div>
        <div class="flex gap-2">
          <template v-if="!editMode">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-[#15803d] px-3 py-2 text-sm font-medium text-white hover:bg-[#166534] transition-colors"
              @click="editMode = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.629-.629Z" />
              </svg>
              แก้ไข
            </button>
          </template>
          <template v-else>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              @click="cancelEdit"
            >
              ยกเลิก
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-[#15803d] px-3 py-2 text-sm font-medium text-white hover:bg-[#166534] transition-colors disabled:opacity-60"
              :disabled="saving"
              @click="save"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs" />
              บันทึก
            </button>
          </template>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Left: Info + Edit form -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Basic info card -->
          <div class="bg-white rounded-xl border border-neutral-200 p-5">
            <h2 class="text-sm font-semibold text-neutral-700 mb-4">ข้อมูลออเดอร์</h2>
            <div v-if="!editMode" class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">เลขออเดอร์</p>
                <p class="font-mono font-semibold text-neutral-900">{{ order.bookingNo }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">การชำระเงิน</p>
                <p class="font-medium text-neutral-800">{{ order.payment === 'paid' ? 'ชำระครบแล้ว' : 'มัดจำ' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">แพคเกจ</p>
                <p class="text-neutral-800">{{ order.packageName ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">สไตล์บายศรี</p>
                <p class="text-neutral-800">{{ order.baiseeStyle ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">ชื่อผู้รับ</p>
                <p class="text-neutral-800">{{ order.recipientName ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">เบอร์ผู้รับ</p>
                <p class="text-neutral-800">{{ order.recipientPhone ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">บ้านเลขที่/ห้อง</p>
                <p class="text-neutral-800">{{ order.deliveryNo ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">หมู่บ้าน/อาคาร</p>
                <p class="text-neutral-800">{{ order.deliveryVillage ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">ถนน/ซอย</p>
                <p class="text-neutral-800">{{ order.deliveryStreet ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">จังหวัด</p>
                <p class="text-neutral-800">{{ resolvedProvinceName ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">อำเภอ/เขต</p>
                <p class="text-neutral-800">{{ resolvedDistrictName ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">ตำบล/แขวง</p>
                <p class="text-neutral-800">{{ resolvedSubDistrictName ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">รหัสไปรษณีย์</p>
                <p class="text-neutral-800">{{ resolvedZipcodeName ?? '-' }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">วันงาน</p>
                <p class="text-neutral-800">{{ formatDate(order.eventDate) }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">นัดส่ง</p>
                <p class="text-neutral-800">{{ formatDateTime(order.scheduledAt) }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">ส่งจริง</p>
                <p class="text-neutral-800">{{ formatDateTime(order.deliveryAt) }}</p>
              </div>
            </div>

            <!-- Edit form -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">เลขออเดอร์ *</label>
                <input v-model="form.bookingNo" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">สถานะ</label>
                <BaseSelectDropdown v-model="form.status" :options="statusOptions.map(o => ({ label: o.label, value: o.value }))" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">การชำระเงิน</label>
                <BaseSelectDropdown v-model="form.payment" :options="[{ label: 'มัดจำ', value: 'deposit' }, { label: 'ชำระครบ', value: 'paid' }]" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">แพคเกจ</label>
                <input v-model="form.packageName" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">สไตล์บายศรี</label>
                <input v-model="form.baiseeStyle" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ชื่อผู้รับ</label>
                <input v-model="form.recipientName" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">เบอร์ผู้รับ</label>
                <input v-model="form.recipientPhone" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">บ้านเลขที่/ห้อง</label>
                <input v-model="form.deliveryNo" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">หมู่บ้าน/อาคาร</label>
                <input v-model="form.deliveryVillage" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ถนน/ซอย</label>
                <input v-model="form.deliveryStreet" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">จังหวัด</label>
                <BaseSelectDropdown
                  v-model="form.deliveryProvinceId"
                  :options="[{ label: '-- เลือกจังหวัด --', value: '' }, ...provinceOptions.map(p => ({ label: p.name, value: p.id }))]"
                  placeholder="-- เลือกจังหวัด --"
                  @update:model-value="onProvinceChange"
                />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">อำเภอ/เขต</label>
                <BaseSelectDropdown
                  v-model="form.deliveryDistrictId"
                  :options="[{ label: '-- เลือกอำเภอ --', value: '' }, ...districtOptions.map(d => ({ label: d.name, value: d.id }))]"
                  placeholder="-- เลือกอำเภอ --"
                  :disabled="!form.deliveryProvinceId"
                  @update:model-value="onDistrictChange"
                />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ตำบล/แขวง</label>
                <BaseSelectDropdown
                  v-model="form.deliverySubDistrictId"
                  :options="[{ label: '-- เลือกตำบล --', value: '' }, ...subDistrictOptions.map(s => ({ label: s.name, value: s.id }))]"
                  placeholder="-- เลือกตำบล --"
                  :disabled="!form.deliveryDistrictId"
                  @update:model-value="onSubDistrictChange"
                />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">รหัสไปรษณีย์</label>
                <BaseSelectDropdown
                  v-model="form.deliveryZipcodeId"
                  :options="[{ label: '-- เลือกรหัสไปรษณีย์ --', value: '' }, ...zipcodeOptions.map(z => ({ label: z.name, value: z.id }))]"
                  placeholder="-- เลือกรหัสไปรษณีย์ --"
                  :disabled="!form.deliverySubDistrictId"
                />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">วันงาน</label>
                <BaseDatePicker v-model="form.eventDate" mode="date" placeholder="เลือกวันงาน" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">นัดส่ง</label>
                <BaseDatePicker v-model="form.scheduledAt" mode="datetime" placeholder="เลือกวันนัดส่ง" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">
                  วันส่งจริง
                  <span v-if="form.status === 'delivered'" class="ml-1 text-emerald-600">(ลงอัตโนมัติ)</span>
                </label>
                <BaseDatePicker
                  v-model="form.deliveryAt"
                  mode="datetime"
                  placeholder="เลือกวันส่งจริง"
                  :disabled="false"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Financial summary -->
        <div class="space-y-4">
          <div class="bg-white rounded-xl border border-neutral-200 p-5">
            <h2 class="text-sm font-semibold text-neutral-700 mb-4">สรุปยอดเงิน</h2>
            <div v-if="!editMode" class="space-y-2.5 text-sm">
              <div class="flex justify-between">
                <span class="text-neutral-500">ราคาพื้นฐาน</span>
                <span class="font-medium text-neutral-900">฿{{ formatPrice(order.basePrice) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-500">ราคาเพิ่มเติม</span>
                <span class="font-medium text-neutral-900">฿{{ formatPrice(order.addonPrice) }}</span>
              </div>
              <div class="border-t border-neutral-100 pt-2 flex justify-between">
                <span class="font-semibold text-neutral-800">ยอดรวม</span>
                <span class="font-bold text-neutral-900">฿{{ formatPrice(order.totalPrice) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-500">มัดจำ</span>
                <span class="text-neutral-800">฿{{ formatPrice(order.depositAmount) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-neutral-500">ชำระแล้ว</span>
                <span class="text-emerald-700 font-medium">฿{{ formatPrice(order.paidAmount) }}</span>
              </div>
              <div class="border-t border-neutral-100 pt-2 flex justify-between">
                <span class="font-semibold text-neutral-800">คงเหลือ</span>
                <span
                  class="font-bold text-lg"
                  :class="order.balanceAmount > 0 ? 'text-red-600' : 'text-emerald-600'"
                >
                  ฿{{ formatPrice(order.balanceAmount) }}
                </span>
              </div>
            </div>

            <!-- Edit financial -->
            <div v-else class="space-y-3 text-sm">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ราคาพื้นฐาน (฿)</label>
                <input v-model="form.basePrice" type="number" min="0" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ราคาเพิ่มเติม (฿)</label>
                <input v-model="form.addonPrice" type="number" min="0" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">มัดจำ (฿)</label>
                <input v-model="form.depositAmount" type="number" min="0" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ชำระแล้ว (฿)</label>
                <input v-model="form.paidAmount" type="number" min="0" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
              </div>
              <div class="rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500">
                ยอดรวม = ราคาพื้นฐาน + ราคาเพิ่มเติม<br />
                คงเหลือ = ยอดรวม - ชำระแล้ว (คำนวณโดยระบบ)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Booking Details ───────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 class="text-sm font-semibold text-neutral-700">รายการสินค้า</h2>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:border-[#bbf7d0] hover:bg-[#f0fdf4] hover:text-[#166534] transition-colors"
            @click="openDetailAdd"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            เพิ่มรายการ
          </button>
        </div>

        <!-- Add / Edit form -->
        <div v-if="showDetailForm" class="px-5 py-4 bg-neutral-50 border-b border-neutral-100">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div ref="productDropdownRef" class="col-span-2 relative">
              <label class="block text-xs text-neutral-500 mb-1">ชื่อรายการ *</label>
              <input
                v-model="productSearch"
                type="text"
                placeholder="พิมพ์หรือเลือกสินค้า..."
                autocomplete="off"
                class="w-full h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
                @input="onProductSearchInput"
                @focus="showProductDropdown = true"
              />
              <!-- Dropdown list -->
              <div
                v-if="showProductDropdown && filteredProducts.length > 0"
                class="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
              >
                <button
                  v-for="p in filteredProducts"
                  :key="p.id"
                  type="button"
                  class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50 transition-colors text-left"
                  @mousedown.prevent="selectProduct(p)"
                >
                  <span class="text-neutral-900 font-medium truncate">{{ p.name }}</span>
                  <span class="text-neutral-400 text-xs shrink-0 ml-2">฿{{ p.price.toLocaleString() }}</span>
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">ตัวเลือก</label>
              <input v-model="detailForm.option" type="text" placeholder="-" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">วัสดุ</label>
              <input v-model="detailForm.material" type="text" placeholder="-" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">จำนวน *</label>
              <input v-model="detailForm.quantity" type="number" min="1" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">ราคา/ชิ้น (฿) *</label>
              <input v-model="detailForm.unitPrice" type="number" min="0" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-neutral-500 mb-1">หมายเหตุ</label>
              <input v-model="detailForm.note" type="text" placeholder="-" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-[#15803d] px-3 py-2 text-sm font-medium text-white hover:bg-[#166534] transition-colors disabled:opacity-60"
              :disabled="savingDetail"
              @click="saveDetail(false)"
            >
              <span v-if="savingDetail" class="loading loading-spinner loading-xs" />
              {{ editingDetailId ? 'บันทึก' : 'เพิ่ม' }}
            </button>
            <button
              v-if="!editingDetailId"
              class="inline-flex items-center gap-1.5 rounded-lg border border-[#15803d] text-[#15803d] px-3 py-2 text-sm font-medium hover:bg-[#f0fdf4] transition-colors disabled:opacity-60"
              :disabled="savingDetail"
              @click="saveDetail(true)"
            >
              <span v-if="savingDetail" class="loading loading-spinner loading-xs" />
              + เพิ่มอีกรายการ
            </button>
            <button
              class="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
              @click="showDetailForm = false"
            >
              ยกเลิก
            </button>
          </div>
        </div>

        <div v-if="loadingDetails" class="flex items-center justify-center py-10">
          <span class="loading loading-spinner loading-sm text-[#16a34a]" />
        </div>
        <div v-else-if="details.length === 0 && !showDetailForm" class="flex items-center justify-center py-10">
          <p class="text-sm text-neutral-400">ยังไม่มีรายการสินค้า</p>
        </div>
        <div v-else-if="details.length > 0" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th class="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">ชื่อรายการ</th>
                <th class="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">ตัวเลือก</th>
                <th class="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">วัสดุ</th>
                <th class="px-4 py-2.5 text-right text-xs font-medium text-neutral-500">จำนวน</th>
                <th class="px-4 py-2.5 text-right text-xs font-medium text-neutral-500">ราคา/ชิ้น</th>
                <th class="px-4 py-2.5 text-right text-xs font-medium text-neutral-500">รวม</th>
                <th class="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">หมายเหตุ</th>
                <th class="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-50">
              <tr v-for="d in details" :key="d.id" class="hover:bg-neutral-50 transition-colors">
                <td class="px-4 py-2.5 font-medium text-neutral-900">{{ d.itemName }}</td>
                <td class="px-4 py-2.5 text-neutral-600">{{ d.option ?? '-' }}</td>
                <td class="px-4 py-2.5 text-neutral-600">{{ d.material ?? '-' }}</td>
                <td class="px-4 py-2.5 text-right text-neutral-900">{{ d.quantity }}</td>
                <td class="px-4 py-2.5 text-right text-neutral-900">฿{{ formatPrice(d.unitPrice) }}</td>
                <td class="px-4 py-2.5 text-right font-semibold text-neutral-900">฿{{ formatPrice(d.subtotal) }}</td>
                <td class="px-4 py-2.5 text-neutral-500 text-xs">{{ d.note ?? '-' }}</td>
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-1 justify-end">
                    <button
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-neutral-300 bg-white hover:border-[#bbf7d0] hover:bg-[#f0fdf4] hover:text-[#166534] transition-colors"
                      title="แก้ไข"
                      @click="openDetailEdit(d)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      :disabled="deletingDetailId === d.id"
                      title="ลบ"
                      @click="confirmDeleteDetail(d.id)"
                    >
                      <span v-if="deletingDetailId === d.id" class="loading loading-spinner loading-xs" />
                      <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Booking Attachments ────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 class="text-sm font-semibold text-neutral-700">ไฟล์แนบ</h2>
          <span v-if="attachments.filter(a => a.attachmentType === 'payment_slip' && !a.isVerified).length > 0" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
              <path fill-rule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
            </svg>
            มีสลิปรอยืนยัน {{ attachments.filter(a => a.attachmentType === 'payment_slip' && !a.isVerified).length }} รายการ
          </span>
        </div>
        <div v-if="loadingAttachments" class="flex items-center justify-center py-10">
          <span class="loading loading-spinner loading-sm text-[#16a34a]" />
        </div>
        <div v-else-if="attachments.length === 0" class="flex items-center justify-center py-10">
          <p class="text-sm text-neutral-400">ยังไม่มีไฟล์แนบ</p>
        </div>
        <div v-else class="divide-y divide-neutral-100">
          <div v-for="a in attachments" :key="a.id">
            <!-- File row -->
            <div class="flex items-center justify-between gap-4 px-5 py-3" :class="paymentVerifyId === a.id ? 'bg-green-50' : ''">
              <div class="flex items-center gap-3 min-w-0">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                  :class="attachmentTypeLabel[a.attachmentType]?.cls ?? 'bg-neutral-100 text-neutral-600'"
                >
                  {{ attachmentTypeLabel[a.attachmentType]?.label ?? a.attachmentType }}
                </span>
                <a :href="a.fileUrl" target="_blank" rel="noopener" class="text-sm text-blue-600 hover:underline truncate">{{ a.fileName }}</a>
                <span v-if="a.fileSize" class="text-xs text-neutral-400 shrink-0">{{ (a.fileSize / 1024).toFixed(0) }} KB</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="a.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ a.isVerified ? 'ยืนยันแล้ว' : 'รอยืนยัน' }}
                </span>

                <!-- Payment slip: special verify button -->
                <button
                  v-if="!a.isVerified && a.attachmentType === 'payment_slip'"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                  :disabled="verifyingAttachmId === a.id"
                  @click="openPaymentVerify(a)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                    <path fill-rule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" clip-rule="evenodd" />
                  </svg>
                  ยืนยันการชำระเงิน
                </button>

                <!-- Other types: simple verify button -->
                <button
                  v-else-if="!a.isVerified"
                  class="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-neutral-300 bg-white hover:border-[#bbf7d0] hover:bg-[#f0fdf4] hover:text-[#166534] transition-colors disabled:opacity-50"
                  :disabled="verifyingAttachmId === a.id"
                  title="ยืนยัน"
                  @click="doVerifyAttachment(a.id)"
                >
                  <span v-if="verifyingAttachmId === a.id" class="loading loading-spinner loading-xs" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                  </svg>
                </button>

                <button
                  class="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  :disabled="deletingAttachmId === a.id"
                  title="ลบ"
                  @click="doDeleteAttachment(a.id)"
                >
                  <span v-if="deletingAttachmId === a.id" class="loading loading-spinner loading-xs" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Payment verification inline panel -->
            <div v-if="paymentVerifyId === a.id" class="px-5 py-4 bg-green-50 border-t border-green-100">
              <p class="text-xs font-semibold text-green-800 mb-3 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" clip-rule="evenodd" />
                </svg>
                ตรวจสอบการชำระเงิน — กรอกข้อมูลแล้วกดยืนยัน
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <label class="block text-xs text-neutral-500 mb-1">สถานะการชำระเงิน</label>
                  <BaseSelectDropdown
                    v-model="paymentVerifyForm.payment"
                    :options="[{ label: 'มัดจำ (ชำระบางส่วน)', value: 'deposit' }, { label: 'ชำระครบแล้ว', value: 'paid' }]"
                  />
                </div>
                <div>
                  <label class="block text-xs text-neutral-500 mb-1">ยอดที่ชำระมาแล้ว (฿)</label>
                  <input
                    v-model="paymentVerifyForm.paidAmount"
                    type="number"
                    min="0"
                    class="w-full h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
                  />
                </div>
              </div>
              <div class="flex gap-2 mt-3">
                <button
                  class="inline-flex items-center gap-1.5 rounded-lg bg-[#15803d] px-3 py-2 text-sm font-medium text-white hover:bg-[#166534] transition-colors disabled:opacity-60"
                  :disabled="verifyingAttachmId === a.id"
                  @click="submitPaymentVerify(a.id)"
                >
                  <span v-if="verifyingAttachmId === a.id" class="loading loading-spinner loading-xs" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                  </svg>
                  ยืนยันการชำระเงิน
                </button>
                <button
                  class="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                  @click="paymentVerifyId = null"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Booking Messages ───────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100">
          <h2 class="text-sm font-semibold text-neutral-700">บันทึก / ข้อความ</h2>
        </div>
        <div v-if="loadingMessages" class="flex items-center justify-center py-10">
          <span class="loading loading-spinner loading-sm text-[#16a34a]" />
        </div>
        <div v-else>
          <div class="max-h-80 overflow-y-auto px-5 divide-y divide-neutral-50">
            <div v-if="messages.length === 0" class="flex items-center justify-center py-10">
              <p class="text-sm text-neutral-400">ยังไม่มีข้อความ</p>
            </div>
            <div v-for="m in messages" :key="m.id" class="py-3">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="{
                    'bg-blue-100 text-blue-700': m.senderType === 'admin',
                    'bg-neutral-100 text-neutral-600': m.senderType === 'system',
                    'bg-purple-100 text-purple-700': m.senderType === 'customer',
                  }"
                >
                  {{ m.senderType === 'admin' ? 'แอดมิน' : m.senderType === 'customer' ? 'ลูกค้า' : 'ระบบ' }}
                </span>
                <span class="text-xs text-neutral-400">{{ formatDateTime(m.createdAt) }}</span>
              </div>
              <p class="text-sm text-neutral-800 leading-relaxed">{{ m.message }}</p>
            </div>
          </div>
          <div class="border-t border-neutral-100 px-5 py-3 flex gap-2">
            <input
              v-model="msgInput"
              type="text"
              placeholder="พิมพ์ข้อความ..."
              class="flex-1 h-9 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
              @keyup.enter="sendMessage"
            />
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-[#15803d] px-4 py-2 text-sm font-medium text-white hover:bg-[#166534] transition-colors disabled:opacity-60"
              :disabled="sendingMsg || !msgInput.trim()"
              @click="sendMessage"
            >
              <span v-if="sendingMsg" class="loading loading-spinner loading-xs" />
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.654 5.25H5.75a.75.75 0 0 1 0 1.5H3.933l-1.654 5.25a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
              ส่ง
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
