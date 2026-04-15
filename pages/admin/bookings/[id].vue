<script setup lang="ts">
import type { BookingStatus, PaymentType, BookingDetailRow, BookingMessageRow, BookingAttachmentRow } from '~/composables/useAdminOrderApi'
import BaseModalComponent from '~/components/base/BaseModal.vue'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { getBooking, updateBooking, decideBookingCancelRequest, listBookingDetails, createBookingDetail, updateBookingDetail, deleteBookingDetail, listBookingMessages, createBookingMessage, listBookingAttachments, deleteBookingAttachment, verifyBookingAttachment } = useAdminOrderApi()
const { listProducts } = useAdminCatalogApi()
const { listProvinces, listDistricts, listSubDistricts, listZipcodes, getProvince, getDistrict, getSubDistrict, getZipcode } = useAddressApi()
const toast = useAppToast()

const loading = ref(true)
const saving = ref(false)
const editMode = ref(false)
const refreshing = ref(false)
const quickUpdatingStatus = ref<BookingStatus | null>(null)
const cancelStatusModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const cancelStatusContext = ref<'save' | 'quick' | null>(null)
const cancelStatusQueued = ref<BookingStatus | null>(null)
const reopenCancelModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const rejectCancelRequestModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const cancelDecisionLoading = ref(false)
const cancelRejectReason = ref('')

const order = ref<Awaited<ReturnType<typeof getBooking>> | null>(null)
const isCanceledOrder = computed(() => order.value?.status === 'canceled')
const showRefundRequestShortcut = computed(() => isCanceledOrder.value && Number(order.value?.refundAmount || 0) > 0)
const refundRequestMessage = computed(() => {
  const bookingNo = order.value?.bookingNo || '-'
  const amount = Number(order.value?.refundAmount || 0)
  return `สวัสดีค่ะ ออเดอร์เลขที่ ${bookingNo} ถูกยกเลิก และมียอดคืนเงิน ${formatPrice(amount)} บาท กรุณาแจ้งช่องทางรับเงินคืน (ธนาคาร/พร้อมเพย์) พร้อมชื่อบัญชีและเลขบัญชี เพื่อให้ทีมงานดำเนินการโอนคืนให้ค่ะ`
})

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
  form.eventDate = toLocalDatetimeInput(order.value.eventDate)
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

const guardCanceledReadOnly = () => {
  if (!isCanceledOrder.value) return false
  toast.warning('ออเดอร์นี้ถูกยกเลิกแล้ว (อ่านอย่างเดียว)')
  return true
}

const copyRefundRequestShortcut = async () => {
  if (!showRefundRequestShortcut.value) return
  try {
    await navigator.clipboard.writeText(refundRequestMessage.value)
    toast.success('คัดลอกข้อความขอช่องทางคืนเงินแล้ว')
  } catch {
    toast.error('คัดลอกข้อความไม่สำเร็จ')
  }
}

const requestReopenCanceledOrder = () => {
  if (!isCanceledOrder.value) return
  reopenCancelModalRef.value?.open()
}

const reopenCanceledOrder = async () => {
  if (!isCanceledOrder.value) return
  reopenCancelModalRef.value?.close()
  await quickUpdateStatus('confirmed', true)
}

const requestCancelStatusConfirm = (context: 'save' | 'quick', nextStatus: BookingStatus) => {
  cancelStatusContext.value = context
  cancelStatusQueued.value = nextStatus
  cancelStatusModalRef.value?.open()
}

const resetCancelStatusConfirm = () => {
  cancelStatusContext.value = null
  cancelStatusQueued.value = null
}

const cancelStatusPreviewPaidAmount = computed(() => {
  if (cancelStatusContext.value === 'save') return Math.max(0, Number(form.paidAmount || 0))
  return Math.max(0, Number(order.value?.paidAmount || 0))
})

const save = async (skipCancelConfirm = false) => {
  if (guardCanceledReadOnly()) return
  if (!form.bookingNo.trim()) {
    toast.warning('กรุณากรอกเลขออเดอร์')
    return
  }
  if (!skipCancelConfirm && form.status === 'canceled' && order.value?.status !== 'canceled') {
    requestCancelStatusConfirm('save', 'canceled')
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

const quickStatusOptions: { value: BookingStatus; label: string }[] = [
  { value: 'confirmed', label: 'ยืนยันแล้ว' },
  { value: 'in_production', label: 'กำลังผลิต' },
  { value: 'ready', label: 'พร้อมส่ง' },
  { value: 'delivered', label: 'ส่งแล้ว' },
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

const paidAmountValue = computed(() => Math.max(0, order.value?.paidAmount ?? 0))
const outstandingAmount = computed(() => Math.max(0, order.value?.balanceAmount ?? 0))
const paymentProgressPercent = computed(() => {
  const total = Math.max(0, order.value?.totalPrice ?? 0)
  if (total <= 0) return 0
  const percent = Math.round((paidAmountValue.value / total) * 100)
  return Math.max(0, Math.min(100, percent))
})
const paymentProgressLabel = computed(() => outstandingAmount.value > 0 ? 'รอชำระเพิ่ม' : 'ชำระครบแล้ว')

const refreshAll = async () => {
  refreshing.value = true
  try {
    await load()
    await Promise.all([loadDetails(), loadMessages(), loadAttachments()])
  } finally {
    refreshing.value = false
  }
}

const handleRefresh = async () => {
  try {
    await refreshAll()
    toast.success('รีเฟรชข้อมูลล่าสุดแล้ว')
  } catch {
    toast.error('รีเฟรชข้อมูลไม่สำเร็จ')
  }
}

const quickUpdateStatus = async (nextStatus: BookingStatus, skipCancelConfirm = false) => {
  if (isCanceledOrder.value && nextStatus === 'canceled') {
    toast.warning('สถานะนี้ถูกใช้อยู่แล้ว')
    return
  }
  if (isCanceledOrder.value && nextStatus !== 'canceled') {
    // Allow reopening a canceled order without opening full edit mode.
  } else {
    if (guardCanceledReadOnly()) return
  }
  if (!order.value) return
  if (quickUpdatingStatus.value) return
  if (order.value.status === nextStatus) {
    toast.warning('สถานะนี้ถูกใช้อยู่แล้ว')
    return
  }
  if (!skipCancelConfirm && nextStatus === 'canceled') {
    requestCancelStatusConfirm('quick', nextStatus)
    return
  }
  quickUpdatingStatus.value = nextStatus
  try {
    const current = order.value
    order.value = await updateBooking(id, {
      bookingNo: current.bookingNo,
      status: nextStatus,
      payment: current.payment,
      packageName: current.packageName,
      baiseeStyle: current.baiseeStyle,
      recipientName: current.recipientName,
      recipientPhone: current.recipientPhone,
      deliveryNo: current.deliveryNo,
      deliveryVillage: current.deliveryVillage,
      deliveryStreet: current.deliveryStreet,
      deliveryProvinceId: current.deliveryProvinceId,
      deliveryDistrictId: current.deliveryDistrictId,
      deliverySubDistrictId: current.deliverySubDistrictId,
      deliveryZipcodeId: current.deliveryZipcodeId,
      eventDate: current.eventDate,
      scheduledAt: current.scheduledAt,
      deliveryAt: nextStatus === 'delivered' ? (current.deliveryAt || new Date().toISOString()) : current.deliveryAt,
      basePrice: current.basePrice,
      addonPrice: current.addonPrice,
      depositAmount: current.depositAmount,
      paidAmount: current.paidAmount,
    })
    populateForm()
    if (order.value) await resolveAddressNames(order.value)
    toast.success('อัปเดตสถานะเรียบร้อย')
  } catch {
    toast.error('ไม่สามารถอัปเดตสถานะแบบด่วนได้')
  } finally {
    quickUpdatingStatus.value = null
  }
}

const confirmCancelStatusChange = async () => {
  const context = cancelStatusContext.value
  const nextStatus = cancelStatusQueued.value
  cancelStatusModalRef.value?.close()
  resetCancelStatusConfirm()
  if (!nextStatus) return
  if (context === 'save') {
    form.status = nextStatus
    await save(true)
    return
  }
  if (context === 'quick') {
    await quickUpdateStatus(nextStatus, true)
  }
}

// ─── Booking Details ──────────────────────────────────────────────────────────

const details = ref<BookingDetailRow[]>([])
const customerNotes = computed(() =>
  Array.from(new Set(details.value.map(d => d.note?.trim()).filter((note): note is string => Boolean(note)))),
)
const loadingDetails = ref(false)
const showDetailForm = ref(false)
const editingDetailId = ref<string | null>(null)
const savingDetail = ref(false)
const deletingDetailId = ref('')
const detailForm = reactive({ itemName: '', isAddon: true, option: '', material: '', quantity: 1, unitPrice: 0, note: '' })

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
  if (guardCanceledReadOnly()) return
  editingDetailId.value = null
  Object.assign(detailForm, { itemName: '', isAddon: true, option: '', material: '', quantity: 1, unitPrice: 0, note: '' })
  productSearch.value = ''
  showProductDropdown.value = false
  showDetailForm.value = true
  loadProductOptions()
}

const openDetailEdit = (d: BookingDetailRow) => {
  if (guardCanceledReadOnly()) return
  editingDetailId.value = d.id
  Object.assign(detailForm, { itemName: d.itemName, isAddon: d.isAddon, option: d.option ?? '', material: d.material ?? '', quantity: d.quantity, unitPrice: d.unitPrice, note: d.note ?? '' })
  productSearch.value = d.itemName
  showProductDropdown.value = false
  showDetailForm.value = true
  loadProductOptions()
}

const saveDetail = async (keepOpen = false) => {
  if (guardCanceledReadOnly()) return
  if (!detailForm.itemName.trim() || detailForm.quantity < 1) return
  savingDetail.value = true
  try {
    const payload = { bookingId: id, itemName: detailForm.itemName, isAddon: detailForm.isAddon, option: detailForm.option || null, material: detailForm.material || null, quantity: Number(detailForm.quantity), unitPrice: Number(detailForm.unitPrice), note: detailForm.note || null }
    if (editingDetailId.value) {
      await updateBookingDetail(editingDetailId.value, payload)
      showDetailForm.value = false
    } else {
      await createBookingDetail(payload)
      if (!keepOpen) {
        showDetailForm.value = false
      } else {
        // reset form for next item
        Object.assign(detailForm, { itemName: '', isAddon: true, option: '', material: '', quantity: 1, unitPrice: 0, note: '' })
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
  if (guardCanceledReadOnly()) return
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
const cancelRequestSystemPrefix = 'คำขอยกเลิกจากลูกค้า (รออนุมัติ):'
const cancelApprovedSystemPrefix = 'คำขอยกเลิกถูกอนุมัติโดยแอดมิน'
const cancelRejectedSystemPrefix = 'คำขอยกเลิกถูกปฏิเสธโดยแอดมิน:'
const pendingCancelRequestReason = computed(() => {
  let reason = ''
  let pending = false
  for (const m of messages.value) {
    const text = String(m.message || '').trim()
    if (m.senderType === 'system' && text.startsWith(cancelRequestSystemPrefix)) {
      reason = text.replace(cancelRequestSystemPrefix, '').trim()
      pending = true
      continue
    }
    if (m.senderType === 'system' && (text.startsWith(cancelApprovedSystemPrefix) || text.startsWith(cancelRejectedSystemPrefix))) {
      pending = false
      reason = ''
    }
  }
  return pending ? reason : ''
})
const hasPendingCancelRequest = computed(() => Boolean(pendingCancelRequestReason.value))
const hasRestoredPaymentHistory = computed(() =>
  messages.value.some(m =>
    m.senderType === 'system' && /ดึงยอดชำระกลับ|ปลดสถานะยกเลิก/.test(String(m.message || '')),
  ),
)

const loadMessages = async () => {
  loadingMessages.value = true
  try { messages.value = await listBookingMessages(id) } catch {}
  finally { loadingMessages.value = false }
}

const sendMessage = async () => {
  if (guardCanceledReadOnly()) return
  if (!msgInput.value.trim()) return
  sendingMsg.value = true
  try {
    const m = await createBookingMessage({ bookingId: id, senderType: 'admin', message: msgInput.value.trim() })
    messages.value.push(m)
    msgInput.value = ''
  } catch { toast.error('ไม่สามารถส่งข้อความได้') }
  finally { sendingMsg.value = false }
}

const approveCancelRequest = async () => {
  if (!order.value || cancelDecisionLoading.value || !hasPendingCancelRequest.value) return
  cancelDecisionLoading.value = true
  try {
    await decideBookingCancelRequest(id, { approve: true })
    await refreshAll()
    toast.success('อนุมัติคำขอยกเลิกแล้ว')
  } catch {
    toast.error('ไม่สามารถอนุมัติคำขอยกเลิกได้')
  } finally {
    cancelDecisionLoading.value = false
  }
}

const openRejectCancelRequest = () => {
  cancelRejectReason.value = ''
  rejectCancelRequestModalRef.value?.open()
}

const rejectCancelRequest = async () => {
  if (!order.value || cancelDecisionLoading.value || !hasPendingCancelRequest.value) return
  if (!cancelRejectReason.value.trim()) {
    toast.warning('กรุณาระบุเหตุผลที่ไม่อนุมัติ')
    return
  }
  cancelDecisionLoading.value = true
  try {
    await decideBookingCancelRequest(id, {
      approve: false,
      reason: cancelRejectReason.value.trim(),
    })
    rejectCancelRequestModalRef.value?.close()
    await refreshAll()
    toast.success('บันทึกการไม่อนุมัติคำขอยกเลิกแล้ว')
  } catch {
    toast.error('ไม่สามารถบันทึกการไม่อนุมัติคำขอยกเลิกได้')
  } finally {
    cancelDecisionLoading.value = false
  }
}

// ─── Booking Attachments ──────────────────────────────────────────────────────

const attachments = ref<BookingAttachmentRow[]>([])
const loadingAttachments = ref(false)
const deletingAttachmId = ref('')
const verifyingAttachmId = ref('')

// Payment verification panel state
const paymentVerifyId = ref<string | null>(null)
const paymentVerifyForm = reactive({ payment: 'deposit' as PaymentType, paidAmount: 0, confirmedAmount: null as number | null })

const attachmentTypeLabel: Record<string, { label: string; cls: string }> = {
  payment_slip: { label: 'สลิปโอนเงิน', cls: 'bg-green-100 text-green-700' },
  reference:    { label: 'อ้างอิง',      cls: 'bg-blue-100 text-blue-700' },
  contract:     { label: 'สัญญา',        cls: 'bg-purple-100 text-purple-700' },
  event_proof:  { label: 'หลักฐานงาน',   cls: 'bg-amber-100 text-amber-700' },
  other:        { label: 'อื่นๆ',        cls: 'bg-neutral-100 text-neutral-600' },
}

const paymentChannelLabel = (channel: string | null, bankName: string | null) => {
  if (channel === 'promptpay') return 'พร้อมเพย์'
  if (channel === 'qr_code') return 'QR Code'
  if (channel === 'other') return 'ช่องทางอื่นๆ'
  return bankName || 'บัญชีธนาคาร'
}

const verifiedPaymentSlipAmount = computed(() =>
  attachments.value
    .filter(a => a.attachmentType === 'payment_slip' && a.isVerified)
    .reduce((sum, a) => sum + Math.max(0, Number(a.paymentAmount || 0)), 0),
)

const verifiedPaymentSlipCount = computed(() =>
  attachments.value.filter(a => a.attachmentType === 'payment_slip' && a.isVerified).length,
)

const pendingPaymentSlipCount = computed(() =>
  attachments.value.filter(a => a.attachmentType === 'payment_slip' && !a.isVerified).length,
)

const orderTotalForSlipSummary = computed(() => Math.max(0, Number(order.value?.totalPrice || 0)))
const verifiedPaymentSlipRemaining = computed(() => Math.max(0, orderTotalForSlipSummary.value - verifiedPaymentSlipAmount.value))
const verifiedPaymentSlipProgress = computed(() => {
  if (orderTotalForSlipSummary.value <= 0) return 0
  const p = Math.round((verifiedPaymentSlipAmount.value / orderTotalForSlipSummary.value) * 100)
  return Math.max(0, Math.min(100, p))
})

const verifiedPaymentByChannel = computed(() => {
  const channelOrder = ['bank', 'promptpay', 'qr_code', 'other'] as const
  const map: Record<string, { key: string; label: string; amount: number; count: number }> = {}

  for (const key of channelOrder) {
    map[key] = {
      key,
      label: paymentChannelLabel(key, null),
      amount: 0,
      count: 0,
    }
  }

  for (const a of attachments.value) {
    if (a.attachmentType !== 'payment_slip' || !a.isVerified) continue
    const key = a.paymentMethodChannel || 'other'
    if (!map[key]) {
      map[key] = {
        key,
        label: paymentChannelLabel(key, a.paymentMethodBankName),
        amount: 0,
        count: 0,
      }
    }
    map[key].amount += Math.max(0, Number(a.paymentAmount || 0))
    map[key].count += 1
  }

  return Object.values(map).filter(item => item.amount > 0 || item.count > 0)
})

const activePaymentVerifyAttachment = computed(() =>
  attachments.value.find(a => a.id === paymentVerifyId.value) || null,
)

const isImageAttachment = (a: BookingAttachmentRow) => {
  const mime = String(a.mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif)$/i.test(a.fileName)
}

const attachmentSizeLabel = (size: number | null) => {
  const n = Number(size || 0)
  if (!Number.isFinite(n) || n <= 0) return '-'
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

const loadAttachments = async () => {
  loadingAttachments.value = true
  try { attachments.value = await listBookingAttachments(id) } catch {}
  finally { loadingAttachments.value = false }
}

const doDeleteAttachment = async (attachId: string) => {
  if (guardCanceledReadOnly()) return
  deletingAttachmId.value = attachId
  try { await deleteBookingAttachment(attachId); attachments.value = attachments.value.filter(a => a.id !== attachId); toast.success('ลบไฟล์แนบเรียบร้อย') }
  catch { toast.error('ไม่สามารถลบไฟล์แนบได้') }
  finally { deletingAttachmId.value = '' }
}

const doVerifyAttachment = async (attachId: string) => {
  if (guardCanceledReadOnly()) return
  verifyingAttachmId.value = attachId
  try {
    await verifyBookingAttachment(attachId)
    await loadAttachments()
    toast.success('ยืนยันไฟล์แนบเรียบร้อย')
  } catch { toast.error('ไม่สามารถยืนยันไฟล์แนบได้') }
  finally { verifyingAttachmId.value = '' }
}

const openPaymentVerify = (a: BookingAttachmentRow) => {
  if (guardCanceledReadOnly()) return
  if (!a.paymentAmount || a.paymentAmount <= 0) {
    toast.warning('ไม่สามารถยืนยันสลิปนี้ได้ เพราะยังไม่มียอดเงินในไฟล์')
    return
  }
  const currentPaid = Number(order.value?.paidAmount || 0)
  const slipAmount = Number(a.paymentAmount || 0)
  const nextPaid = currentPaid + Math.max(0, slipAmount)
  const total = Number(order.value?.totalPrice || 0)

  paymentVerifyForm.payment = nextPaid >= total ? 'paid' : 'deposit'
  paymentVerifyForm.paidAmount = nextPaid
  paymentVerifyForm.confirmedAmount = null
  paymentVerifyId.value = a.id
}

const submitPaymentVerify = async (attachId: string) => {
  if (guardCanceledReadOnly()) return
  if (!order.value) return
  const target = attachments.value.find(a => a.id === attachId) || null
  if (!target) {
    toast.warning('ไม่พบไฟล์ที่ต้องการยืนยัน')
    return
  }
  if (!Number.isFinite(Number(paymentVerifyForm.confirmedAmount)) || Number(paymentVerifyForm.confirmedAmount) <= 0) {
    toast.warning('กรุณากรอกยอดเงินที่ตรวจสอบแล้วก่อนยืนยัน')
    return
  }
  if (!target.paymentAmount || Math.abs(Number(paymentVerifyForm.confirmedAmount) - Number(target.paymentAmount)) > 0.01) {
    toast.warning('ยอดที่แอดมินยืนยันไม่ตรงกับยอดในไฟล์สลิป')
    return
  }
  verifyingAttachmId.value = attachId
  try {
    // 1. Mark attachment as verified
    await verifyBookingAttachment(attachId, Number(paymentVerifyForm.confirmedAmount))
    await loadAttachments()

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
  } catch (error) {
    const e = error as { data?: { code?: string } }
    if (e?.data?.code === 'invalid-payment-amount') {
      toast.warning('ไม่สามารถยืนยันสลิปนี้ได้ เพราะยังไม่มียอดเงินในไฟล์')
      return
    }
    if (e?.data?.code === 'invalid-confirmed-amount') {
      toast.warning('กรุณากรอกยอดเงินที่แอดมินตรวจสอบแล้ว')
      return
    }
    if (e?.data?.code === 'payment-amount-mismatch') {
      toast.warning('ยอดที่แอดมินยืนยันไม่ตรงกับยอดในไฟล์สลิป')
      return
    }
    toast.error('ไม่สามารถยืนยันการชำระเงินได้')
  }
  finally { verifyingAttachmId.value = '' }
}

onMounted(async () => {
  await refreshAll()
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
      <div v-if="isCanceledOrder" class="rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
        <p>ออเดอร์นี้ถูกยกเลิกแล้ว ระบบล็อกเป็นโหมดอ่านอย่างเดียว</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
            :disabled="Boolean(quickUpdatingStatus)"
            @click="requestReopenCanceledOrder"
          >
            เปลี่ยนใจไม่ยกเลิก (ดึงยอดชำระกลับ)
          </button>
          <button
            v-if="showRefundRequestShortcut"
            type="button"
            class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            @click="copyRefundRequestShortcut"
          >
            คัดลอกข้อความขอช่องทางคืนเงิน
          </button>
        </div>
      </div>

      <div v-if="hasPendingCancelRequest && !isCanceledOrder" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p class="font-semibold">ลูกค้าส่งคำขอยกเลิกแล้ว (รอแอดมินพิจารณา)</p>
        <p class="mt-1 text-amber-800">เหตุผลจากลูกค้า: {{ pendingCancelRequestReason || '-' }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
            :disabled="cancelDecisionLoading"
            @click="approveCancelRequest"
          >
            อนุมัติการยกเลิก
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            :disabled="cancelDecisionLoading"
            @click="openRejectCancelRequest"
          >
            ไม่อนุมัติ (ระบุเหตุผล)
          </button>
        </div>
      </div>

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
          <button
            class="ns-admin-btn ns-admin-btn-secondary disabled:opacity-60"
            :disabled="refreshing || saving"
            @click="handleRefresh"
          >
            <span v-if="refreshing" class="loading loading-spinner loading-xs" />
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.84 1.29.75.75 0 0 0-1.106 1.018 7 7 0 0 0 12.522-1.638H18a.75.75 0 0 0 0-1.5h-2.688a.75.75 0 0 0-.75.75v.08Zm-10.624-2.848a5.5 5.5 0 0 1 9.84-1.29.75.75 0 0 0 1.106-1.018A7 7 0 0 0 3.112 7.906H2a.75.75 0 0 0 0 1.5h2.688a.75.75 0 0 0 .75-.75v-.08Z" clip-rule="evenodd" />
            </svg>
            รีเฟรช
          </button>
          <template v-if="!editMode">
            <button
              class="ns-admin-btn ns-admin-btn-primary"
              :disabled="isCanceledOrder"
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
              class="ns-admin-btn ns-admin-btn-secondary"
              @click="cancelEdit"
            >
              ยกเลิก
            </button>
            <button
              class="ns-admin-btn ns-admin-btn-primary disabled:opacity-60"
              :disabled="saving"
              @click="save"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs" />
              บันทึก
            </button>
          </template>
        </div>
      </div>

      <div class="rounded-xl border border-neutral-200 bg-white p-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold text-neutral-500">แก้ไขสถานะแบบด่วน</span>
          <button
            v-for="opt in quickStatusOptions"
            :key="`quick-${opt.value}`"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60"
            :class="order?.status === opt.value
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-200 hover:bg-emerald-50/70'"
            :disabled="isCanceledOrder || Boolean(quickUpdatingStatus) || saving || refreshing"
            @click="quickUpdateStatus(opt.value)"
          >
            <span v-if="quickUpdatingStatus === opt.value" class="loading loading-spinner loading-xs" />
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4" :class="isCanceledOrder ? 'opacity-75 saturate-50' : ''">
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
                <p class="text-neutral-800">{{ formatDateTime(order.eventDate) }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">นัดส่ง</p>
                <p class="text-neutral-800">{{ formatDateTime(order.scheduledAt) }}</p>
              </div>
              <div>
                <p class="text-neutral-400 text-xs mb-0.5">ส่งจริง</p>
                <p class="text-neutral-800">{{ formatDateTime(order.deliveryAt) }}</p>
              </div>
              <div class="md:col-span-2">
                <p class="text-neutral-400 text-xs mb-0.5">หมายเหตุจากลูกค้า</p>
                <p v-if="customerNotes.length === 0" class="text-neutral-800">-</p>
                <div v-else class="space-y-1">
                  <p v-for="(note, idx) in customerNotes" :key="`${note}-${idx}`" class="text-neutral-800 whitespace-pre-wrap break-words">{{ note }}</p>
                </div>
              </div>
            </div>

            <!-- Edit form -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">เลขออเดอร์ *</label>
                <input v-model="form.bookingNo" type="text" class="ns-admin-input" />
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
                <input v-model="form.packageName" type="text" class="ns-admin-input" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">สไตล์บายศรี</label>
                <input v-model="form.baiseeStyle" type="text" class="ns-admin-input" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ชื่อผู้รับ</label>
                <input v-model="form.recipientName" type="text" class="ns-admin-input" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">เบอร์ผู้รับ</label>
                <input v-model="form.recipientPhone" type="text" class="ns-admin-input" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">บ้านเลขที่/ห้อง</label>
                <input v-model="form.deliveryNo" type="text" class="ns-admin-input" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">หมู่บ้าน/อาคาร</label>
                <input v-model="form.deliveryVillage" type="text" class="ns-admin-input" placeholder="-" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ถนน/ซอย</label>
                <input v-model="form.deliveryStreet" type="text" class="ns-admin-input" placeholder="-" />
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
                <label class="block text-xs text-neutral-500 mb-1">วันงาน (วันและเวลา)</label>
                <BaseDatePicker v-model="form.eventDate" mode="datetime" placeholder="เลือกวันและเวลา" />
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
            <div v-if="!editMode" class="space-y-3">
              <div class="rounded-xl border border-[#ecfdf3] bg-[#f9fefb] p-3">
                <p class="text-xs text-neutral-500">ยอดรวมสุทธิ</p>
                <p class="mt-1 text-2xl font-bold text-[#166534]">฿{{ formatPrice(order.totalPrice) }}</p>
                <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div class="rounded-lg bg-white border border-[#ecfdf3] px-3 py-2">
                    <p class="text-[11px] text-neutral-500">ราคาพื้นฐาน</p>
                    <p class="font-semibold text-neutral-900">฿{{ formatPrice(order.basePrice) }}</p>
                  </div>
                  <div class="rounded-lg bg-white border border-[#ecfdf3] px-3 py-2">
                    <p class="text-[11px] text-neutral-500">ราคาเพิ่มเติม</p>
                    <p class="font-semibold text-neutral-900">฿{{ formatPrice(order.addonPrice) }}</p>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-[#ecfdf3] bg-white p-3 space-y-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="text-neutral-600">ชำระแล้ว</span>
                  <span class="font-semibold text-neutral-900">฿{{ formatPrice(paidAmountValue) }}</span>
                </div>
                <div v-if="hasRestoredPaymentHistory" class="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                  ดึงยอดชำระกลับแล้ว
                </div>
                <div class="h-2 w-full rounded-full bg-[#ecfdf3] overflow-hidden">
                  <div class="h-full rounded-full bg-[#22c55e] transition-all" :style="{ width: `${paymentProgressPercent}%` }" />
                </div>
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-neutral-500">{{ paymentProgressPercent }}% ของยอดรวม</span>
                  <span class="font-medium" :class="outstandingAmount > 0 ? 'text-amber-700' : 'text-[#166534]'">{{ paymentProgressLabel }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                  <div class="rounded-lg bg-[#f9fefb] border border-[#ecfdf3] px-3 py-2">
                    <p class="text-[11px] text-neutral-500">มัดจำ</p>
                    <p class="font-semibold text-neutral-900">฿{{ formatPrice(order.depositAmount) }}</p>
                  </div>
                  <div class="rounded-lg px-3 py-2 border" :class="outstandingAmount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-[#f0fdf4] border-[#bbf7d0]'">
                    <p class="text-[11px]" :class="outstandingAmount > 0 ? 'text-amber-700' : 'text-[#166534]'">คงเหลือ</p>
                    <p class="font-semibold" :class="outstandingAmount > 0 ? 'text-amber-800' : 'text-[#166534]'">฿{{ formatPrice(outstandingAmount) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Edit financial -->
            <div v-else class="space-y-3 text-sm">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ราคาพื้นฐาน (฿)</label>
                <input v-model="form.basePrice" type="number" min="0" class="ns-admin-input" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ราคาเพิ่มเติม (฿)</label>
                <input v-model="form.addonPrice" type="number" min="0" class="ns-admin-input" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">มัดจำ (฿)</label>
                <input v-model="form.depositAmount" type="number" min="0" class="ns-admin-input" />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ชำระแล้ว (฿)</label>
                <input v-model="form.paidAmount" type="number" min="0" class="ns-admin-input" />
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
            :disabled="isCanceledOrder"
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
                class="ns-admin-input"
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
              <input v-model="detailForm.option" type="text" placeholder="-" class="ns-admin-input" />
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">วัสดุ</label>
              <input v-model="detailForm.material" type="text" placeholder="-" class="ns-admin-input" />
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">จำนวน *</label>
              <input v-model="detailForm.quantity" type="number" min="1" class="ns-admin-input" />
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">ราคา/ชิ้น (฿) *</label>
              <input v-model="detailForm.unitPrice" type="number" min="0" class="ns-admin-input" />
            </div>
            <div class="col-span-2 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
              <input v-model="detailForm.isAddon" type="checkbox" class="h-4 w-4 rounded border-neutral-300 text-[#166534] focus:ring-[#166534]" />
              <div>
                <p class="text-xs font-medium text-neutral-700">คิดเป็นค่าเสริม (Add-on)</p>
                <p class="text-[11px] text-neutral-500">ปิดไว้เมื่อเป็นของที่รวมในแพคเกจแล้ว</p>
              </div>
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-neutral-500 mb-1">หมายเหตุ</label>
              <input v-model="detailForm.note" type="text" placeholder="-" class="ns-admin-input" />
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button
              class="ns-admin-btn ns-admin-btn-primary disabled:opacity-60"
              :disabled="savingDetail"
              @click="saveDetail(false)"
            >
              <span v-if="savingDetail" class="loading loading-spinner loading-xs" />
              {{ editingDetailId ? 'บันทึก' : 'เพิ่ม' }}
            </button>
            <button
              v-if="!editingDetailId"
              class="ns-admin-btn ns-admin-btn-secondary disabled:opacity-60"
              :disabled="savingDetail"
              @click="saveDetail(true)"
            >
              <span v-if="savingDetail" class="loading loading-spinner loading-xs" />
              + เพิ่มอีกรายการ
            </button>
            <button
              class="ns-admin-btn ns-admin-btn-secondary"
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
                <th class="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">ประเภท</th>
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
                <td class="px-4 py-2.5 text-xs">
                  <span class="inline-flex rounded-full px-2 py-0.5 font-medium" :class="d.isAddon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'">
                    {{ d.isAddon ? 'ค่าเสริม' : 'รวมในแพคเกจ' }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-neutral-500 text-xs">{{ d.note ?? '-' }}</td>
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-1 justify-end">
                    <button
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-neutral-300 bg-white hover:border-[#bbf7d0] hover:bg-[#f0fdf4] hover:text-[#166534] transition-colors"
                      :disabled="isCanceledOrder"
                      title="แก้ไข"
                      @click="openDetailEdit(d)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      :disabled="isCanceledOrder || deletingDetailId === d.id"
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
          <span v-if="pendingPaymentSlipCount > 0" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
              <path fill-rule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
            </svg>
            มีสลิปรอยืนยัน {{ pendingPaymentSlipCount }} รายการ
          </span>
        </div>
        <div class="px-5 py-3 border-b border-neutral-100 bg-neutral-50/70">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              รวมยอดจากสลิปที่ยืนยันแล้ว: <span class="font-semibold">฿{{ formatPrice(verifiedPaymentSlipAmount) }}</span>
            </div>
            <div class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">
              เทียบยอดออเดอร์: <span class="font-semibold">฿{{ formatPrice(orderTotalForSlipSummary) }}</span>
            </div>
            <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              คงเหลือจากยอดออเดอร์: <span class="font-semibold">฿{{ formatPrice(verifiedPaymentSlipRemaining) }}</span>
            </div>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <div class="h-2 flex-1 rounded-full bg-neutral-200 overflow-hidden">
              <div class="h-full rounded-full bg-emerald-500 transition-all" :style="{ width: `${verifiedPaymentSlipProgress}%` }" />
            </div>
            <span class="text-xs text-neutral-600">{{ verifiedPaymentSlipProgress }}% (ยืนยัน {{ verifiedPaymentSlipCount }} ไฟล์)</span>
          </div>
          <div v-if="verifiedPaymentByChannel.length" class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div v-for="item in verifiedPaymentByChannel" :key="`sum-${item.key}`" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <p class="font-semibold text-slate-800">{{ item.label }}</p>
              <p>ยอดยืนยันแล้ว: <span class="font-semibold">฿{{ formatPrice(item.amount) }}</span></p>
              <p>จำนวนสลิป: <span class="font-semibold">{{ item.count }}</span></p>
            </div>
          </div>
        </div>
        <div v-if="loadingAttachments" class="flex items-center justify-center py-10">
          <span class="loading loading-spinner loading-sm text-[#16a34a]" />
        </div>
        <div v-else-if="attachments.length === 0" class="flex items-center justify-center py-10">
          <p class="text-sm text-neutral-400">ยังไม่มีไฟล์แนบ</p>
        </div>
        <div v-else class="p-4">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="a in attachments"
              :key="a.id"
              class="group relative overflow-hidden rounded-xl border border-[#d8f5e4] bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-24px_rgba(22,101,52,0.9)]"
            >
              <button
                type="button"
                class="absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-500 text-white shadow-sm transition hover:bg-red-600 disabled:opacity-60"
                :disabled="isCanceledOrder || deletingAttachmId === a.id"
                @click="doDeleteAttachment(a.id)"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <a :href="a.fileUrl" target="_blank" rel="noopener noreferrer" class="block">
                <div class="h-28 border-b border-[#eefcf3] bg-[#f8fefb]">
                  <img v-if="isImageAttachment(a)" :src="a.fileUrl" :alt="a.fileName" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full items-center justify-center text-xs font-semibold text-neutral-500">FILE</div>
                </div>
              </a>

              <div class="space-y-1 px-2.5 py-2">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" :class="attachmentTypeLabel[a.attachmentType]?.cls ?? 'bg-neutral-100 text-neutral-600'">
                  {{ attachmentTypeLabel[a.attachmentType]?.label ?? a.attachmentType }}
                </span>
                <p class="truncate text-xs font-medium text-neutral-700">{{ a.fileName }}</p>
                <p v-if="a.attachmentType === 'payment_slip' && a.paymentMethodChannel" class="truncate text-[11px] text-emerald-700">
                  ช่องทาง: {{ paymentChannelLabel(a.paymentMethodChannel, a.paymentMethodBankName) }}
                </p>
                <p v-if="a.paymentAmount" class="truncate text-[11px] text-emerald-700">ยอด ฿{{ formatPrice(a.paymentAmount) }}</p>
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[11px] text-neutral-400">{{ attachmentSizeLabel(a.fileSize) }}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full border" :class="a.isVerified ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]' : 'bg-yellow-50 text-yellow-700 border-yellow-200'">
                    {{ a.isVerified ? 'ยืนยันแล้ว' : 'รอยืนยัน' }}
                  </span>
                </div>
                <button
                  v-if="!a.isVerified && a.attachmentType === 'payment_slip'"
                  type="button"
                  class="mt-1 w-full rounded-lg border border-green-300 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  :disabled="isCanceledOrder || verifyingAttachmId === a.id || !a.paymentAmount || a.paymentAmount <= 0"
                  @click="openPaymentVerify(a)"
                >
                  ยืนยันการชำระเงิน
                </button>
                <button
                  v-else-if="!a.isVerified"
                  type="button"
                  class="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:border-[#bbf7d0] hover:bg-[#f0fdf4] hover:text-[#166534] disabled:opacity-50"
                  :disabled="isCanceledOrder || verifyingAttachmId === a.id"
                  @click="doVerifyAttachment(a.id)"
                >
                  ยืนยันไฟล์
                </button>
                <p v-if="!a.isVerified && a.attachmentType === 'payment_slip' && (!a.paymentAmount || a.paymentAmount <= 0)" class="text-[11px] text-rose-600">
                  ต้องกรอกยอดเงินก่อนยืนยัน
                </p>
              </div>
            </div>
          </div>

          <div v-if="activePaymentVerifyAttachment" class="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
            <p class="text-xs font-semibold text-green-800 mb-3">ตรวจสอบการชำระเงิน — กรอกยอดที่แอดมินตรวจสอบแล้วก่อนยืนยัน</p>
            <p v-if="activePaymentVerifyAttachment.paymentAmount" class="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
              ยอดจากไฟล์นี้: ฿{{ formatPrice(activePaymentVerifyAttachment.paymentAmount) }}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">สถานะการชำระเงิน</label>
                <BaseSelectDropdown
                  v-model="paymentVerifyForm.payment"
                  :options="[{ label: 'มัดจำ (ชำระบางส่วน)', value: 'deposit' }, { label: 'ชำระครบแล้ว', value: 'paid' }]"
                />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ยอดที่ชำระมาแล้วรวม (฿)</label>
                <input
                  v-model="paymentVerifyForm.paidAmount"
                  type="number"
                  min="0"
                  class="ns-admin-input"
                />
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">ยอดที่แอดมินยืนยันในไฟล์นี้ (฿) <span class="text-rose-600">*</span></label>
                <input
                  v-model.number="paymentVerifyForm.confirmedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="ns-admin-input"
                  placeholder="กรอกยอดที่ตรวจสอบแล้ว"
                />
              </div>
            </div>
            <div class="flex gap-2 mt-3">
              <button
                class="ns-admin-btn ns-admin-btn-primary disabled:opacity-60"
                :disabled="verifyingAttachmId === activePaymentVerifyAttachment.id"
                @click="submitPaymentVerify(activePaymentVerifyAttachment.id)"
              >
                <span v-if="verifyingAttachmId === activePaymentVerifyAttachment.id" class="loading loading-spinner loading-xs" />
                ยืนยันการชำระเงิน
              </button>
              <button class="ns-admin-btn ns-admin-btn-secondary" @click="paymentVerifyId = null">ยกเลิก</button>
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
              class="ns-admin-input flex-1 bg-slate-50"
              :disabled="isCanceledOrder"
              @keyup.enter="sendMessage"
            />
            <button
              class="ns-admin-btn ns-admin-btn-primary disabled:opacity-60"
              :disabled="isCanceledOrder || sendingMsg || !msgInput.trim()"
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

    <BaseModal ref="cancelStatusModalRef" id="booking-cancel-status-confirm" title="ยืนยันการยกเลิกออเดอร์" close-label="ปิด">
      <div class="space-y-3">
        <p class="text-sm text-neutral-700">คุณกำลังจะเปลี่ยนสถานะออเดอร์นี้เป็น <span class="font-semibold text-rose-700">ยกเลิก</span> ใช่หรือไม่?</p>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          การยกเลิกจะไม่ลบข้อมูลออเดอร์ และประวัติทั้งหมดจะยังคงอยู่ในระบบ
        </div>
        <div v-if="cancelStatusPreviewPaidAmount > 0" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          พบยอดชำระแล้ว ฿{{ formatPrice(cancelStatusPreviewPaidAmount) }} ระบบจะทำรายการคืนเงินอัตโนมัติ
        </div>
      </div>
      <template #actions>
        <div class="w-full flex items-center justify-end gap-2">
          <button
            type="button"
            class="ns-admin-btn ns-admin-btn-secondary"
            @click="cancelStatusModalRef?.close(); resetCancelStatusConfirm()"
          >
            ปิด
          </button>
          <button
            type="button"
            class="rounded-xl border border-rose-700 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            @click="confirmCancelStatusChange"
          >
            ยืนยันการยกเลิก
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="reopenCancelModalRef" id="booking-reopen-cancel-confirm" title="ยืนยันเปลี่ยนใจไม่ยกเลิก" close-label="ปิด">
      <div class="space-y-3">
        <p class="text-sm text-neutral-700">ต้องการปลดสถานะยกเลิกของออเดอร์นี้ใช่หรือไม่?</p>
        <div class="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          หากออเดอร์นี้มีประวัติคืนเงิน ระบบจะดึงยอดชำระกลับให้อัตโนมัติ
        </div>
      </div>
      <template #actions>
        <div class="w-full flex items-center justify-end gap-2">
          <button
            type="button"
            class="ns-admin-btn ns-admin-btn-secondary"
            @click="reopenCancelModalRef?.close()"
          >
            ปิด
          </button>
          <button
            type="button"
            class="rounded-xl border border-sky-700 bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            @click="reopenCanceledOrder"
          >
            ยืนยันปลดสถานะยกเลิก
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="rejectCancelRequestModalRef" id="booking-reject-cancel-request" title="ไม่อนุมัติคำขอยกเลิก" close-label="ปิด">
      <div class="space-y-3">
        <p class="text-sm text-neutral-700">กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอยกเลิก ระบบจะส่งเหตุผลนี้ให้ลูกค้า</p>
        <textarea
          v-model="cancelRejectReason"
          rows="4"
          maxlength="500"
          placeholder="เช่น งานใกล้จัดส่งแล้ว จึงยังไม่สามารถยกเลิกได้"
          class="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#166534]"
        />
      </div>
      <template #actions>
        <div class="w-full flex items-center justify-end gap-2">
          <button
            type="button"
            class="ns-admin-btn ns-admin-btn-secondary"
            :disabled="cancelDecisionLoading"
            @click="rejectCancelRequestModalRef?.close()"
          >
            ปิด
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-700 bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
            :disabled="cancelDecisionLoading"
            @click="rejectCancelRequest"
          >
            {{ cancelDecisionLoading ? 'กำลังบันทึก...' : 'ยืนยันไม่อนุมัติ' }}
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
