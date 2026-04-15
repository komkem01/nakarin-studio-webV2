<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'สั่งบายศรี - Nakarin Studio' })

const { listProducts, listPackages, listPromotions } = useCustomerApi()
const { getSession, authFetch } = useCustomerAuth()
const {
  paymentMethods,
  pending: paymentMethodsPending,
  error: paymentMethodsError,
  paymentCheckoutSetting,
} = usePaymentMethods()
const toast = useAppToast()

const paymentChannelLabel = (channel: string, bankName?: string) => {
  if (channel === 'promptpay') return 'พร้อมเพย์'
  if (channel === 'qr_code') return 'QR Code'
  if (channel === 'other') return 'ช่องทางอื่นๆ'
  return bankName || 'บัญชีธนาคาร'
}

// ── ข้อมูลสินค้า/แพคเกจ ────────────────────────────────────────────────────

const products = ref<any[]>([])
const packages = ref<any[]>([])
const loadingInit = ref(true)

onMounted(async () => {
  try {
    const [pRes, kRes] = await Promise.all([listProducts(1, 100), listPackages(1, 100)])
    products.value = (pRes.items || []).filter((p: any) => p.is_active)
    packages.value = (kRes.items || []).filter((p: any) => p.is_active)
  } finally {
    loadingInit.value = false
  }
})

// ── ขั้นตอน ─────────────────────────────────────────────────────────────────

type Step = 'select' | 'address' | 'confirm'
const step = ref<Step>('select')

// ── step 1: เลือกแพคเกจหรือสินค้า ──────────────────────────────────────────

type SelectMode = 'package' | 'product'
const selectMode = ref<SelectMode>('package')
const selectedPackageId = ref('')
const selectedProductIds = ref<string[]>([])

const selectedPackage = computed(() => packages.value.find((p: any) => p.id === selectedPackageId.value))
const selectedProducts = computed(() => products.value.filter((p: any) => selectedProductIds.value.includes(p.id)))

const toggleProduct = (id: string) => {
  const idx = selectedProductIds.value.indexOf(id)
  if (idx >= 0) selectedProductIds.value.splice(idx, 1)
  else selectedProductIds.value.push(id)
}

// ── step 2: ที่อยู่จัดส่ง ──────────────────────────────────────────────────

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const pickStr = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) { const v = o[k]; if (typeof v === 'string' && v) return v } return ''
}
const pickNum = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) { const v = Number(o[k]); if (Number.isFinite(v)) return v } return 0
}

type Province = { id: string; name: string }
type District = { id: string; name: string }
type Subdistrict = { id: string; name: string }
type Zipcode = { id: string; code: string }

const provinces = ref<Province[]>([])
const districts = ref<District[]>([])
const subdistricts = ref<Subdistrict[]>([])
const zipcodes = ref<Zipcode[]>([])
const loadingAddr = ref(false)

const config = useRuntimeConfig()
const apiFetch = <T>(url: string, q?: Record<string, string>) =>
  $fetch<any>(url, { baseURL: config.public.apiBase, query: q })

const form = reactive({
  recipientName: '',
  recipientPhone: '',
  deliveryNo: '',
  deliveryVillage: '',
  deliveryStreet: '',
  provinceId: '',
  districtId: '',
  subdistrictId: '',
  zipcodeId: '',
  eventDate: '',
  baiseeStyle: '',
  note: '',
  promoCode: '',
})

const addrErrors = reactive({
  recipientName: '', recipientPhone: '', provinceId: '',
  districtId: '', subdistrictId: '', zipcodeId: '', eventDate: '',
})

watch(() => form.provinceId, async (id) => {
  form.districtId = ''; form.subdistrictId = ''; form.zipcodeId = ''
  districts.value = []; subdistricts.value = []; zipcodes.value = []
  if (!id) return
  const res = await apiFetch<any>(`/api/v1/systems/districts/province/${id}`)
  districts.value = (Array.isArray(res?.data) ? res.data : []).map((d: any) => ({
    id: pickStr(asRecord(d), 'id'), name: pickStr(asRecord(d), 'name'),
  }))
})
watch(() => form.districtId, async (id) => {
  form.subdistrictId = ''; form.zipcodeId = ''
  subdistricts.value = []; zipcodes.value = []
  if (!id) return
  const res = await apiFetch<any>(`/api/v1/systems/subdistricts/district/${id}`)
  subdistricts.value = (Array.isArray(res?.data) ? res.data : []).map((d: any) => ({
    id: pickStr(asRecord(d), 'id'), name: pickStr(asRecord(d), 'name'),
  }))
})
watch(() => form.subdistrictId, async (id) => {
  form.zipcodeId = ''; zipcodes.value = []
  if (!id) return
  const res = await apiFetch<any>(`/api/v1/systems/zipcodes/subdistrict/${id}`)
  zipcodes.value = (Array.isArray(res?.data) ? res.data : []).map((d: any) => ({
    id: pickStr(asRecord(d), 'id'), code: pickStr(asRecord(d), 'code', 'zipcode', 'postal_code', 'name'),
  }))
})

const loadProvinces = async () => {
  loadingAddr.value = true
  const res = await apiFetch<any>('/api/v1/systems/provinces')
  provinces.value = (Array.isArray(res?.data) ? res.data : []).map((d: any) => ({
    id: pickStr(asRecord(d), 'id'), name: pickStr(asRecord(d), 'name'),
  }))
  loadingAddr.value = false
}

// Pre-fill name/phone from session
const prefillFromSession = () => {
  const session = getSession()
  if (!session?.member) return
  form.recipientName = `${session.member.firstName} ${session.member.lastName}`.trim()
}

// ── โปรโมชัน ─────────────────────────────────────────────────────────────────

const promoResult = ref<{ valid: boolean; discount?: number; name?: string } | null>(null)
const checkingPromo = ref(false)

const checkPromo = async () => {
  if (!form.promoCode.trim()) return
  checkingPromo.value = true
  try {
    const res = await $fetch<any>('/api/v1/promotions/validate-code', {
      method: 'POST',
      baseURL: config.public.apiBase,
      body: { code: form.promoCode.trim() },
    })
    const d = asRecord(res?.data)
    if (d.valid) {
      promoResult.value = {
        valid: true,
        discount: pickNum(asRecord(d.promotion), 'discount_value', 'discountValue'),
        name: pickStr(asRecord(d.promotion), 'name'),
      }
    } else {
      promoResult.value = { valid: false }
    }
  } catch {
    promoResult.value = { valid: false }
  } finally {
    checkingPromo.value = false
  }
}

// ── ราคา ─────────────────────────────────────────────────────────────────────

const basePrice = computed(() => {
  if (selectMode.value === 'package' && selectedPackage.value) {
    return Number(selectedPackage.value.price) || 0
  }
  return selectedProducts.value.reduce((s: number, p: any) => s + (Number(p.price) || 0), 0)
})

const discount = computed(() => {
  if (!promoResult.value?.valid || !promoResult.value.discount) return 0
  return promoResult.value.discount
})

const totalPrice = computed(() => Math.max(0, basePrice.value - discount.value))
const depositRequired = computed(() => Math.round(totalPrice.value * 0.5))
const remainingAfterDeposit = computed(() => Math.max(0, totalPrice.value - depositRequired.value))
type PaymentChoice = 'deposit' | 'paid'
const paymentChoice = ref<PaymentChoice>('deposit')
const canPayDeposit = computed(() => paymentCheckoutSetting.value.allowDeposit)
const canPayFull = computed(() => paymentCheckoutSetting.value.allowFullPayment)

watch([canPayDeposit, canPayFull, () => paymentCheckoutSetting.value.defaultPayment], ([allowDeposit, allowFull, defaultPayment]) => {
  if (!allowDeposit && allowFull) {
    paymentChoice.value = 'paid'
    return
  }
  if (allowDeposit && !allowFull) {
    paymentChoice.value = 'deposit'
    return
  }
  if (!allowDeposit && !allowFull) {
    paymentChoice.value = 'deposit'
    return
  }
  if (allowDeposit && allowFull) {
    paymentChoice.value = defaultPayment === 'paid' ? 'paid' : 'deposit'
  }
}, { immediate: true })

const payNowAmount = computed(() => paymentChoice.value === 'paid' ? totalPrice.value : depositRequired.value)
const payLaterAmount = computed(() => Math.max(0, totalPrice.value - payNowAmount.value))
const paymentChoiceLabel = computed(() => paymentChoice.value === 'paid' ? 'ชำระเต็มจำนวน' : 'ชำระมัดจำ 50%')
const selectedCheckoutPaymentMethodId = ref('')

watch(paymentMethods, (methods) => {
  if (!methods.length) {
    selectedCheckoutPaymentMethodId.value = ''
    return
  }
  if (!methods.some(m => m.id === selectedCheckoutPaymentMethodId.value)) {
    selectedCheckoutPaymentMethodId.value = methods[0]?.id || ''
  }
}, { immediate: true })

const selectedCheckoutPaymentMethod = computed(() =>
  paymentMethods.value.find(m => m.id === selectedCheckoutPaymentMethodId.value) || null,
)

const checkoutSlipFile = ref<File | null>(null)
const checkoutSlipAmount = ref<number | null>(null)
const uploadingCheckoutSlip = ref(false)
const checkoutSlipInputRef = ref<HTMLInputElement | null>(null)

const onCheckoutSlipFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  checkoutSlipFile.value = input.files?.[0] || null
}

const openCheckoutSlipPicker = () => {
  checkoutSlipInputRef.value?.click()
}

const clearCheckoutSlipFile = () => {
  checkoutSlipFile.value = null
  if (checkoutSlipInputRef.value) checkoutSlipInputRef.value.value = ''
}

const confirmItems = computed(() => {
  if (selectMode.value === 'product') {
    return selectedProducts.value.map((p: any) => {
      const unitPrice = Number(p.price) || 0
      const quantity = 1
      return {
        key: String(p.id || p.name),
        name: String(p.name || '-'),
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      }
    })
  }

  if (selectedPackage.value?.items?.length) {
    const totalQty = selectedPackage.value.items.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.qty || 1)), 0)
    const fallbackUnitPrice = totalQty > 0 ? (Number(selectedPackage.value.price) || 0) / totalQty : 0
    return selectedPackage.value.items.map((item: any, index: number) => {
      const name = String(item?.product || item?.name || `รายการที่ ${index + 1}`)
      const quantity = Math.max(1, Number(item?.qty || 1))
      const unitPrice = getPackageItemUnitPrice(item, name, fallbackUnitPrice)
      return {
        key: `${name}-${index}`,
        name,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      }
    })
  }

  if (selectedPackage.value) {
    const unitPrice = Number(selectedPackage.value.price) || 0
    return [{
      key: String(selectedPackage.value.id || selectedPackage.value.name),
      name: String(selectedPackage.value.name || '-'),
      quantity: 1,
      unitPrice,
      subtotal: unitPrice,
    }]
  }

  return []
})

const currency = (v: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v)

const formatEventDateTime = (value: string) => {
  const d = new Date(value)
  if (!isFinite(d.getTime())) return value
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── การเดินทาง ────────────────────────────────────────────────────────────────

const goToAddress = () => {
  if (selectMode.value === 'package' && !selectedPackageId.value) {
    toast.error('กรุณาเลือกแพคเกจก่อน')
    return
  }
  if (selectMode.value === 'product' && selectedProductIds.value.length === 0) {
    toast.error('กรุณาเลือกสินค้าอย่างน้อย 1 ชิ้น')
    return
  }
  loadProvinces()
  prefillFromSession()
  step.value = 'address'
}

const validateAddress = () => {
  addrErrors.recipientName = form.recipientName ? '' : 'กรุณากรอกชื่อผู้รับ'
  addrErrors.recipientPhone = form.recipientPhone ? '' : 'กรุณากรอกเบอร์โทรผู้รับ'
  addrErrors.provinceId = form.provinceId ? '' : 'กรุณาเลือกจังหวัด'
  addrErrors.districtId = form.districtId ? '' : 'กรุณาเลือกอำเภอ'
  addrErrors.subdistrictId = form.subdistrictId ? '' : 'กรุณาเลือกตำบล'
  addrErrors.zipcodeId = form.zipcodeId ? '' : 'กรุณาเลือกรหัสไปรษณีย์'
  addrErrors.eventDate = form.eventDate ? '' : 'กรุณาระบุวันงาน'
  return Object.values(addrErrors).every(v => !v)
}

const goToConfirm = () => {
  if (validateAddress()) {
    checkoutSlipFile.value = null
    if (checkoutSlipInputRef.value) checkoutSlipInputRef.value.value = ''
    step.value = 'confirm'
  }
}

// ── ส่งคำสั่ง ─────────────────────────────────────────────────────────────────

const submitting = ref(false)
const canSubmitOrder = computed(() =>
  !!checkoutSlipFile.value &&
  Number(checkoutSlipAmount.value || 0) > 0 &&
  !!selectedCheckoutPaymentMethodId.value &&
  !submitting.value &&
  !uploadingCheckoutSlip.value,
)

const genBookingNo = () => `NS${Date.now().toString(36).toUpperCase()}`

const getPackageItemUnitPrice = (item: any, fallbackName: string, fallbackUnitPrice: number) => {
  const direct = Number(item?.unitPrice ?? item?.unit_price ?? item?.price)
  if (Number.isFinite(direct) && direct >= 0) return direct

  const byName = products.value.find((p: any) => p.name === fallbackName)
  const fromProduct = Number(byName?.price)
  if (Number.isFinite(fromProduct) && fromProduct >= 0) return fromProduct

  return fallbackUnitPrice
}

const buildBookingDetailPayloads = (bookingId: string) => {
  const customerNote = form.note?.trim() || null

  if (selectMode.value === 'product') {
    return selectedProducts.value.map((p: any) => ({
      bookingId,
      itemName: p.name,
      isAddon: false,
      option: null,
      material: null,
      quantity: 1,
      unitPrice: Number(p.price) || 0,
      note: customerNote,
    }))
  }

  if (selectedPackage.value?.items?.length) {
    const totalQty = selectedPackage.value.items.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.qty || 1)), 0)
    const fallbackUnitPrice = totalQty > 0 ? (Number(selectedPackage.value.price) || 0) / totalQty : 0

    return selectedPackage.value.items.map((item: any, index: number) => {
      const itemName = String(item?.product || item?.name || `รายการที่ ${index + 1}`)
      const quantity = Math.max(1, Number(item?.qty || 1))
      return {
        bookingId,
        itemName,
        isAddon: false,
        option: null,
        material: null,
        quantity,
        unitPrice: getPackageItemUnitPrice(item, itemName, fallbackUnitPrice),
        note: customerNote,
      }
    })
  }

  return selectedPackage.value
    ? [{
        bookingId,
        itemName: selectedPackage.value.name,
        isAddon: false,
        option: null,
        material: null,
        quantity: 1,
        unitPrice: Number(selectedPackage.value.price) || 0,
        note: customerNote,
      }]
    : []
}

const handleSubmit = async () => {
  if (!canPayDeposit.value && !canPayFull.value) {
    toast.warning('ยังไม่ได้เปิดตัวเลือกการชำระเงิน กรุณาติดต่อแอดมิน')
    return
  }

  if (!checkoutSlipFile.value) {
    toast.warning('กรุณาแนบสลิปก่อนยืนยันคำสั่งซื้อ')
    return
  }

  if (!Number.isFinite(Number(checkoutSlipAmount.value)) || Number(checkoutSlipAmount.value) <= 0) {
    toast.warning('กรุณากรอกยอดชำระในสลิปให้ถูกต้อง')
    return
  }

  if (!paymentMethods.value.length || !selectedCheckoutPaymentMethodId.value) {
    toast.warning('กรุณาเลือกช่องทางชำระเงินก่อนยืนยันคำสั่งซื้อ')
    return
  }

  submitting.value = true
  try {
    const session = getSession()
    const memberId = session?.member?.id || undefined

    let packageName: string | undefined
    let baiseeStyle: string | undefined

    if (selectMode.value === 'package' && selectedPackage.value) {
      packageName = selectedPackage.value.name
    } else {
      baiseeStyle = selectedProducts.value.map((p: any) => p.name).join(', ')
    }

    const bookingRes = await authFetch<any>('/api/v1/bookings', {
      method: 'POST',
      body: {
        bookingNo: genBookingNo(),
        status: 'pending',
        payment: paymentChoice.value,
        memberId: memberId || null,
        packageName: packageName || null,
        baiseeStyle: baiseeStyle || null,
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        deliveryNo: form.deliveryNo || null,
        deliveryVillage: form.deliveryVillage || null,
        deliveryStreet: form.deliveryStreet || null,
        deliveryProvinceId: form.provinceId || null,
        deliveryDistrictId: form.districtId || null,
        deliverySubDistrictId: form.subdistrictId || null,
        deliveryZipcodeId: form.zipcodeId || null,
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
        basePrice: basePrice.value,
        addonPrice: 0,
        depositAmount: depositRequired.value,
        paidAmount: 0,
      },
    })

    const bookingData = asRecord(bookingRes?.data ?? bookingRes)
    const bookingId = pickStr(bookingData, 'id')

    if (bookingId) {
      const detailsPayload = buildBookingDetailPayloads(bookingId)
      if (detailsPayload.length) {
        const detailResults = await Promise.allSettled(
          detailsPayload.map((payload: Record<string, unknown>) => authFetch('/api/v1/booking-details', { method: 'POST', body: payload }))
        )
        const failedCount = detailResults.filter(r => r.status === 'rejected').length
        if (failedCount > 0) {
          toast.warning(`บันทึกรายการสินค้าไม่ครบ (${failedCount} รายการ)`) 
        }
      }

      uploadingCheckoutSlip.value = true
      try {
        const fd = new FormData()
        fd.append('target', 'payment_slip')
        fd.append('file', checkoutSlipFile.value)

        const uploadRes = await authFetch<{ data?: { id?: string, url?: string } }>('/api/v1/uploads', {
          method: 'POST',
          body: fd,
        })

        const storageId = String(uploadRes?.data?.id || '').trim()
        if (!storageId) throw new Error('missing-upload-id')

        await authFetch('/api/v1/booking-attachments', {
          method: 'POST',
          body: {
            bookingId,
            storageId,
            paymentMethodId: selectedCheckoutPaymentMethodId.value,
            paymentAmount: Number(checkoutSlipAmount.value),
            attachmentType: 'payment_slip',
          },
        })
      } catch {
        toast.warning('สร้างออเดอร์สำเร็จแล้ว แต่แนบสลิปไม่สำเร็จ กรุณาอัปโหลดในหน้าคำสั่งซื้ออีกครั้ง')
      } finally {
        uploadingCheckoutSlip.value = false
      }
    }

    const channelLabel = selectedCheckoutPaymentMethod.value
      ? paymentChannelLabel(selectedCheckoutPaymentMethod.value.channel, selectedCheckoutPaymentMethod.value.bankName)
      : 'ช่องทางที่เลือก'
    toast.success(`รับออเดอร์แล้ว (${paymentChoiceLabel.value} • ${channelLabel}) ทีมงานจะตรวจสอบการชำระเงินให้เร็วที่สุด`)
    await navigateTo('/profile')
  } catch (error) {
    const e = error as { data?: { code?: string } }
    if (e?.data?.code === 'booking-monthly-capacity-exceeded') {
      toast.warning('เดือนนี้คิวการผลิตเต็มแล้ว กรุณาเลือกวันงานเดือนถัดไป')
      return
    }
    toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
  } finally {
    submitting.value = false
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

const fieldCls = (err: string) =>
  `w-full ns-ui-input ${
    err ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-0' : 'border-[#bbf7d0] bg-[#f0fdf4] focus:bg-white'
  }`

const provinceName = computed(() => provinces.value.find(p => p.id === form.provinceId)?.name || '')
const districtName = computed(() => districts.value.find(p => p.id === form.districtId)?.name || '')
const subdistrictName = computed(() => subdistricts.value.find(p => p.id === form.subdistrictId)?.name || '')
const zipcodeName = computed(() => zipcodes.value.find(p => p.id === form.zipcodeId)?.code || '')

const provinceOptions = computed(() => provinces.value.map(p => ({ label: p.name, value: p.id })))
const districtOptions = computed(() => districts.value.map(d => ({ label: d.name, value: d.id })))
const subdistrictOptions = computed(() => subdistricts.value.map(s => ({ label: s.name, value: s.id })))
const zipcodeOptions = computed(() => zipcodes.value.map(z => ({ label: z.code, value: z.id })))
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#f0fdf4_0%,_#ffffff_45%)]">
    <UContainer class="py-10 max-w-4xl">
      <!-- หัวข้อ -->
      <div class="mb-8 space-y-2">
        <span class="inline-flex rounded-full border border-[#bbf7d0] bg-white px-3 py-1 text-xs font-semibold text-[#166534]">ระบบสั่งบายศรีออนไลน์</span>
        <h1 class="text-3xl font-bold text-neutral-900">สั่งบายศรี</h1>
        <p class="text-sm text-neutral-500">เลือกรูปแบบที่ต้องการ แล้วกรอกที่อยู่จัดส่งให้ครบในขั้นตอนเดียว</p>
      </div>

      <!-- Step indicator -->
      <div class="flex items-center gap-2 mb-10 text-sm">
        <div
          v-for="(s, i) in [{ key: 'select', label: 'เลือกบายศรี' }, { key: 'address', label: 'ที่อยู่จัดส่ง' }, { key: 'confirm', label: 'ยืนยันคำสั่ง' }]"
          :key="s.key"
          class="flex items-center gap-2"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
            :class="step === s.key ? 'bg-[#166534] text-white' : ['address', 'confirm'].includes(step) && i < ['select', 'address', 'confirm'].indexOf(step) ? 'bg-[#bbf7d0] text-[#166534]' : 'bg-neutral-100 text-neutral-400'"
          >
            {{ i + 1 }}
          </div>
          <span :class="step === s.key ? 'font-semibold text-[#166534]' : 'text-neutral-400'">{{ s.label }}</span>
          <div v-if="i < 2" class="w-6 h-px bg-neutral-200" />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loadingInit" class="flex justify-center py-20">
        <svg class="animate-spin h-8 w-8 text-[#166534]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- ═══════════════════════ STEP 1: เลือก ═══════════════════════ -->
      <div v-else-if="step === 'select'" class="space-y-6 rounded-2xl border border-[#bbf7d0] bg-white p-6 md:p-7 shadow-[0_18px_40px_-28px_rgba(22,101,52,0.4)]">
        <!-- Toggle -->
        <div class="inline-flex rounded-xl border border-[#bbf7d0] p-1 bg-[#f0fdf4]">
          <button
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            :class="selectMode === 'package' ? 'bg-[#166534] text-white shadow-sm' : 'text-neutral-600 hover:text-[#166534]'"
            @click="selectMode = 'package'"
          >แพคเกจ</button>
          <button
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            :class="selectMode === 'product' ? 'bg-[#166534] text-white shadow-sm' : 'text-neutral-600 hover:text-[#166534]'"
            @click="selectMode = 'product'"
          >สินค้าเดี่ยว</button>
        </div>

        <!-- แพคเกจ -->
        <div v-if="selectMode === 'package'">
          <div v-if="packages.length === 0" class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-6 py-10 text-center text-sm text-neutral-400">
            ยังไม่มีแพคเกจในระบบ
          </div>
          <div v-else class="grid grid-cols-1 gap-4">
            <label
              v-for="pkg in packages"
              :key="pkg.id"
              :for="`pkg-${pkg.id}`"
              class="flex items-start gap-4 rounded-xl border-2 p-5 cursor-pointer transition-all"
              :class="selectedPackageId === pkg.id
                ? 'border-[#166534] bg-[#f0fdf4] shadow-[0_2px_12px_-4px_rgba(22,101,52,0.2)]'
                : 'border-[#bbf7d0] bg-white hover:border-[#166534]/50'"
            >
              <input :id="`pkg-${pkg.id}`" v-model="selectedPackageId" type="radio" :value="pkg.id" class="mt-1 accent-[#166534]" />
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-neutral-900">{{ pkg.name }}</div>
                <div class="text-sm text-neutral-500 mt-0.5">{{ pkg.description || 'แพคเกจบายศรี' }}</div>
                <div v-if="pkg.items?.length" class="mt-2 flex flex-wrap gap-1.5">
                  <span v-for="item in pkg.items" :key="item.id" class="text-xs bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] px-2 py-0.5 rounded-full">
                    {{ item.product }} x{{ item.qty }}
                  </span>
                </div>
              </div>
              <div class="text-lg font-bold text-[#166534] shrink-0">{{ currency(pkg.price) }}</div>
            </label>
          </div>
        </div>

        <!-- สินค้าเดี่ยว -->
        <div v-else>
          <div v-if="products.length === 0" class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-6 py-10 text-center text-sm text-neutral-400">
            ยังไม่มีสินค้าในระบบ
          </div>
          <div v-else class="grid grid-cols-1 gap-3">
            <label
              v-for="product in products"
              :key="product.id"
              :for="`prod-${product.id}`"
              class="flex items-center gap-4 rounded-xl border-2 px-5 py-4 cursor-pointer transition-all"
              :class="selectedProductIds.includes(product.id)
                ? 'border-[#166534] bg-[#f0fdf4] shadow-[0_2px_12px_-4px_rgba(22,101,52,0.2)]'
                : 'border-[#bbf7d0] bg-white hover:border-[#166534]/50'"
            >
              <input :id="`prod-${product.id}`" type="checkbox" :checked="selectedProductIds.includes(product.id)" class="accent-[#166534]" @change="toggleProduct(product.id)" />
              <div class="flex-1 min-w-0">
                <div class="font-medium text-neutral-900">{{ product.name }}</div>
                <div class="text-xs text-neutral-400 mt-0.5">{{ product.category_name }}</div>
              </div>
              <div class="text-sm font-bold text-[#166534] shrink-0">{{ currency(product.price) }}</div>
            </label>
          </div>
        </div>

        <!-- สรุปราคา + ปุ่ม -->
        <div class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-6 py-4 flex items-center justify-between">
          <div>
            <div class="text-xs text-neutral-500">ราคารวม</div>
            <div class="text-2xl font-bold text-[#166534]">{{ currency(basePrice) }}</div>
          </div>
          <button
            class="ns-ui-btn ns-ui-btn-primary disabled:opacity-50"
            :disabled="selectMode === 'package' ? !selectedPackageId : selectedProductIds.length === 0"
            @click="goToAddress"
          >
            ถัดไป →
          </button>
        </div>
      </div>

      <!-- ═══════════════════════ STEP 2: ที่อยู่ ═══════════════════════ -->
      <div v-else-if="step === 'address'" class="space-y-5 rounded-2xl border border-[#bbf7d0] bg-white p-6 md:p-7 shadow-[0_18px_40px_-28px_rgba(22,101,52,0.4)]">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">ชื่อผู้รับ <span class="text-red-500">*</span></label>
            <input v-model="form.recipientName" type="text" placeholder="ชื่อ-นามสกุล" :class="fieldCls(addrErrors.recipientName)" />
            <p v-if="addrErrors.recipientName" class="text-xs text-red-500">{{ addrErrors.recipientName }}</p>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">เบอร์โทรผู้รับ <span class="text-red-500">*</span></label>
            <input v-model="form.recipientPhone" type="tel" placeholder="0812345678" :class="fieldCls(addrErrors.recipientPhone)" />
            <p v-if="addrErrors.recipientPhone" class="text-xs text-red-500">{{ addrErrors.recipientPhone }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">บ้านเลขที่</label>
            <input v-model="form.deliveryNo" type="text" placeholder="เลขที่บ้าน" :class="fieldCls('')" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">หมู่บ้าน/อาคาร</label>
            <input v-model="form.deliveryVillage" type="text" placeholder="หมู่บ้าน/อาคาร" :class="fieldCls('')" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-neutral-700">ถนน/ซอย</label>
          <input v-model="form.deliveryStreet" type="text" placeholder="ถนน/ซอย" :class="fieldCls('')" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">จังหวัด <span class="text-red-500">*</span></label>
            <BaseSelectDropdown
              v-model="form.provinceId"
              :options="provinceOptions"
              :disabled="loadingAddr"
              placeholder="เลือกจังหวัด"
              :button-class="addrErrors.provinceId ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50' : 'border-[#bbf7d0] bg-[#f0fdf4] hover:border-[#86efac] focus:border-[#166534] focus:bg-white'"
            />
            <p v-if="addrErrors.provinceId" class="text-xs text-red-500">{{ addrErrors.provinceId }}</p>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">อำเภอ/เขต <span class="text-red-500">*</span></label>
            <BaseSelectDropdown
              v-model="form.districtId"
              :options="districtOptions"
              :disabled="!form.provinceId"
              placeholder="เลือกอำเภอ/เขต"
              :button-class="addrErrors.districtId ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50' : 'border-[#bbf7d0] bg-[#f0fdf4] hover:border-[#86efac] focus:border-[#166534] focus:bg-white'"
            />
            <p v-if="addrErrors.districtId" class="text-xs text-red-500">{{ addrErrors.districtId }}</p>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">ตำบล/แขวง <span class="text-red-500">*</span></label>
            <BaseSelectDropdown
              v-model="form.subdistrictId"
              :options="subdistrictOptions"
              :disabled="!form.districtId"
              placeholder="เลือกตำบล/แขวง"
              :button-class="addrErrors.subdistrictId ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50' : 'border-[#bbf7d0] bg-[#f0fdf4] hover:border-[#86efac] focus:border-[#166534] focus:bg-white'"
            />
            <p v-if="addrErrors.subdistrictId" class="text-xs text-red-500">{{ addrErrors.subdistrictId }}</p>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">รหัสไปรษณีย์ <span class="text-red-500">*</span></label>
            <BaseSelectDropdown
              v-model="form.zipcodeId"
              :options="zipcodeOptions"
              :disabled="!form.subdistrictId"
              placeholder="เลือกรหัสไปรษณีย์"
              :button-class="addrErrors.zipcodeId ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50' : 'border-[#bbf7d0] bg-[#f0fdf4] hover:border-[#86efac] focus:border-[#166534] focus:bg-white'"
            />
            <p v-if="addrErrors.zipcodeId" class="text-xs text-red-500">{{ addrErrors.zipcodeId }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">วันงาน <span class="text-red-500">*</span></label>
            <BaseDatePicker
              v-model="form.eventDate"
              mode="datetime"
              placeholder="เลือกวันและเวลา"
            />
            <p v-if="addrErrors.eventDate" class="text-xs text-red-500">{{ addrErrors.eventDate }}</p>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-700">รูปแบบ/สไตล์บายศรี</label>
            <input v-model="form.baiseeStyle" type="text" placeholder="เช่น บายศรีปากชาม 5 ชั้น" :class="fieldCls('')" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-neutral-700">หมายเหตุเพิ่มเติม</label>
          <textarea v-model="form.note" rows="3" placeholder="รายละเอียดอื่นๆ ที่ต้องการแจ้ง" :class="fieldCls('')" />
        </div>

        <!-- โค้ดส่วนลด -->
        <div class="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 space-y-3">
          <label class="text-sm font-medium text-neutral-700">โค้ดส่วนลด</label>
          <div class="flex gap-2">
            <input v-model="form.promoCode" type="text" placeholder="ใส่โค้ดส่วนลด" :class="`flex-1 ns-ui-input ${promoResult?.valid === false ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-0' : 'border-[#bbf7d0] bg-white'}`" />
            <button
              :disabled="checkingPromo || !form.promoCode"
              class="ns-ui-btn ns-ui-btn-primary shrink-0 disabled:opacity-50"
              @click="checkPromo"
            >
              {{ checkingPromo ? '...' : 'ใช้โค้ด' }}
            </button>
          </div>
          <p v-if="promoResult?.valid" class="text-sm text-[#166534] font-medium">
            ✓ {{ promoResult.name }} — ลด {{ currency(promoResult.discount || 0) }}
          </p>
          <p v-else-if="promoResult?.valid === false" class="text-sm text-red-500">โค้ดนี้ใช้ไม่ได้</p>
        </div>

        <div class="flex gap-3 pt-2">
          <button class="flex-1 ns-ui-btn ns-ui-btn-secondary" @click="step = 'select'">
            ← ย้อนกลับ
          </button>
          <button class="flex-1 ns-ui-btn ns-ui-btn-primary" @click="goToConfirm">
            ถัดไป →
          </button>
        </div>
      </div>

      <!-- ═══════════════════════ STEP 3: ยืนยัน ═══════════════════════ -->
      <div v-else-if="step === 'confirm'" class="space-y-5 rounded-2xl border border-[#bbf7d0] bg-white p-6 md:p-7 shadow-[0_18px_40px_-28px_rgba(22,101,52,0.4)]">
        <div class="rounded-xl border border-[#bbf7d0] bg-white divide-y divide-[#bbf7d0]">
          <!-- สิ่งที่สั่ง -->
          <div class="px-6 py-4 space-y-3">
            <div class="text-xs text-neutral-400 uppercase tracking-wide">รายการสั่ง</div>
            <div v-if="confirmItems.length" class="overflow-x-auto">
              <table class="w-full min-w-[520px] text-sm">
                <thead>
                  <tr class="text-neutral-400 text-xs">
                    <th class="text-left font-medium py-1.5">รายการ</th>
                    <th class="text-right font-medium py-1.5">จำนวน</th>
                    <th class="text-right font-medium py-1.5">ราคาต่อชิ้น</th>
                    <th class="text-right font-medium py-1.5">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in confirmItems" :key="item.key" class="border-t border-[#ecfdf3]">
                    <td class="py-2.5 text-neutral-800 font-medium">{{ item.name }}</td>
                    <td class="py-2.5 text-right text-neutral-600">{{ item.quantity }}</td>
                    <td class="py-2.5 text-right text-neutral-600">{{ currency(item.unitPrice) }}</td>
                    <td class="py-2.5 text-right text-neutral-900 font-semibold">{{ currency(item.subtotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-sm text-neutral-500">ไม่มีรายการสินค้า</div>
          </div>
          <!-- ที่อยู่ -->
          <div class="px-6 py-4 space-y-1">
            <div class="text-xs text-neutral-400 uppercase tracking-wide">ผู้รับ</div>
            <div class="font-medium text-neutral-900">{{ form.recipientName }} · {{ form.recipientPhone }}</div>
            <div class="text-sm text-neutral-500">
              {{ [form.deliveryNo, form.deliveryVillage, form.deliveryStreet].filter(Boolean).join(' ') }}
              {{ subdistrictName }} {{ districtName }} {{ provinceName }} {{ zipcodeName }}
            </div>
          </div>
          <!-- วันงาน -->
          <div class="px-6 py-4 space-y-1">
            <div class="text-xs text-neutral-400 uppercase tracking-wide">วันงาน</div>
            <div class="font-medium text-neutral-900">{{ formatEventDateTime(form.eventDate) }}</div>
            <div v-if="form.baiseeStyle" class="text-sm text-neutral-500">{{ form.baiseeStyle }}</div>
          </div>
          <!-- หมายเหตุเพิ่มเติม -->
          <div v-if="form.note?.trim()" class="px-6 py-4 space-y-1">
            <div class="text-xs text-neutral-400 uppercase tracking-wide">หมายเหตุเพิ่มเติม</div>
            <div class="text-sm text-neutral-700 whitespace-pre-wrap break-words">{{ form.note }}</div>
          </div>
          <!-- ราคา -->
          <div class="px-6 py-4 space-y-2">
            <div class="rounded-xl border border-[#ecfdf3] bg-[#f9fefb] p-3 space-y-2">
              <div class="flex justify-between text-sm text-neutral-600">
                <span>ยอดก่อนส่วนลด</span><span>{{ currency(basePrice) }}</span>
              </div>
              <div v-if="discount > 0" class="flex justify-between text-sm text-[#166534]">
                <span>ส่วนลด ({{ promoResult?.name }})</span><span>-{{ currency(discount) }}</span>
              </div>
              <div class="flex justify-between font-bold text-neutral-900 border-t border-[#bbf7d0] pt-2">
                <span>ยอดสุทธิ</span><span class="text-[#166534] text-xl">{{ currency(totalPrice) }}</span>
              </div>
            </div>

            <div class="rounded-xl border border-[#ecfdf3] bg-white p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div class="flex items-center justify-between text-neutral-600 sm:block">
                <span class="text-neutral-500">มัดจำที่ต้องชำระ (50%)</span>
                <div class="font-semibold text-neutral-900">{{ currency(depositRequired) }}</div>
              </div>
              <div class="flex items-center justify-between text-neutral-600 sm:block">
                <span class="text-neutral-500">ยอดคงเหลือหลังมัดจำ</span>
                <div class="font-semibold text-neutral-900">{{ currency(remainingAfterDeposit) }}</div>
              </div>
            </div>

            <div class="rounded-xl border border-[#ecfdf3] bg-white p-3 space-y-3">
              <p class="text-sm font-semibold text-neutral-700">เลือกวิธีชำระเงิน</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label v-if="canPayDeposit" class="cursor-pointer rounded-lg border px-3 py-2 transition-colors" :class="paymentChoice === 'deposit' ? 'border-[#166534] bg-[#f0fdf4]' : 'border-neutral-200 bg-white hover:border-[#bbf7d0]'">
                  <input v-model="paymentChoice" type="radio" value="deposit" class="sr-only" />
                  <p class="text-sm font-medium text-neutral-900">ชำระมัดจำ 50%</p>
                  <p class="text-xs text-neutral-500 mt-0.5">ชำระตอนนี้ {{ currency(depositRequired) }}</p>
                </label>
                <label v-if="canPayFull" class="cursor-pointer rounded-lg border px-3 py-2 transition-colors" :class="paymentChoice === 'paid' ? 'border-[#166534] bg-[#f0fdf4]' : 'border-neutral-200 bg-white hover:border-[#bbf7d0]'">
                  <input v-model="paymentChoice" type="radio" value="paid" class="sr-only" />
                  <p class="text-sm font-medium text-neutral-900">ชำระเต็มจำนวน</p>
                  <p class="text-xs text-neutral-500 mt-0.5">ชำระตอนนี้ {{ currency(totalPrice) }}</p>
                </label>
              </div>
              <p v-if="!canPayDeposit && !canPayFull" class="text-xs text-rose-700">ยังไม่ได้เปิดตัวเลือกการชำระเงิน กรุณาติดต่อแอดมิน</p>

              <div class="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-sm">
                <div class="flex items-center justify-between text-neutral-700">
                  <span>ยอดที่ต้องชำระตอนนี้</span>
                  <span class="font-bold text-[#166534]">{{ currency(payNowAmount) }}</span>
                </div>
                <div class="mt-1 flex items-center justify-between text-xs text-neutral-500">
                  <span>ยอดชำระภายหลัง</span>
                  <span>{{ currency(payLaterAmount) }}</span>
                </div>
              </div>

              <div class="rounded-lg border border-[#bbf7d0] bg-[#f9fefb] p-3 text-sm text-neutral-700">
                <p class="font-semibold text-neutral-800 mb-1">วิธีการชำระเงิน</p>
                <div v-if="paymentMethodsPending" class="rounded-lg border border-dashed border-[#bbf7d0] bg-white px-3 py-2 text-neutral-500">กำลังโหลดช่องทางชำระเงิน...</div>
                <div v-else-if="paymentMethods.length" class="space-y-2">
                  <label
                    v-for="method in paymentMethods"
                    :key="method.id"
                    class="block cursor-pointer rounded-lg border bg-white px-3 py-2 transition-colors"
                    :class="selectedCheckoutPaymentMethodId === method.id ? 'border-[#166534] ring-1 ring-[#166534]/20' : 'border-[#d1fae5] hover:border-[#86efac]'"
                  >
                    <input v-model="selectedCheckoutPaymentMethodId" type="radio" :value="method.id" class="sr-only" />
                    <div class="flex items-start justify-between gap-2">
                      <p class="font-medium text-neutral-900">{{ paymentChannelLabel(method.channel, method.bankName) }}</p>
                      <span
                        class="rounded-full border px-2 py-0.5 text-[11px]"
                        :class="selectedCheckoutPaymentMethodId === method.id ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]' : 'border-neutral-200 text-neutral-500'"
                      >
                        {{ selectedCheckoutPaymentMethodId === method.id ? 'เลือกแล้ว' : 'เลือก' }}
                      </span>
                    </div>
                    <p v-if="method.accountNumber" class="text-neutral-700">เลขบัญชี: {{ method.accountNumber }}</p>
                    <p v-if="method.promptPayId" class="text-neutral-700">เลขพร้อมเพย์: {{ method.promptPayId }}</p>
                    <p class="text-neutral-600">ชื่อบัญชี: {{ method.accountName }}</p>
                    <div v-if="method.qrCodeUrl" class="mt-2">
                      <p class="mb-1 text-center text-xs text-neutral-500">QR Code</p>
                      <div class="flex justify-center">
                        <img :src="method.qrCodeUrl" alt="Payment QR" class="h-36 w-36 rounded-md border border-[#d1fae5] object-cover" loading="lazy" />
                      </div>
                    </div>
                  </label>
                  <p class="text-xs text-[#166534]">ช่องทางที่เลือก: {{ selectedCheckoutPaymentMethod ? paymentChannelLabel(selectedCheckoutPaymentMethod.channel, selectedCheckoutPaymentMethod.bankName) : '-' }}</p>
                </div>
                <p v-else-if="paymentMethodsError" class="text-rose-700">โหลดช่องทางชำระเงินจากระบบไม่สำเร็จ</p>
                <p v-else class="text-neutral-500">ยังไม่ได้ตั้งค่าช่องทางชำระเงิน</p>
                <p class="text-xs text-neutral-500 mt-1">หมายเหตุ: แนบสลิปได้ทันทีด้านล่าง หรือไปอัปโหลดเพิ่มภายหลังในหน้าคำสั่งซื้อ</p>
              </div>

              <div class="space-y-1">
                <label class="text-sm font-medium text-neutral-700">แนบสลิป <span class="text-red-500">*</span></label>
                <input
                  v-model.number="checkoutSlipAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="ยอดที่โอนในสลิป เช่น 1500"
                  class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#166534]"
                />
                <p class="text-xs text-neutral-500">กรอกยอดเงินของไฟล์สลิปนี้เพื่อให้แอดมินตรวจสอบได้ง่ายขึ้น</p>
                <input
                  ref="checkoutSlipInputRef"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="hidden"
                  @change="onCheckoutSlipFileChange"
                />
                <div class="rounded-xl border border-dashed border-[#bbf7d0] bg-[#f8fffb] p-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-[#bbf7d0] bg-white px-3 py-1.5 text-sm font-medium text-[#166534] transition-colors hover:bg-[#f0fdf4]"
                      @click="openCheckoutSlipPicker"
                    >
                      เลือกไฟล์สลิป
                    </button>
                    <button
                      v-if="checkoutSlipFile"
                      type="button"
                      class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
                      @click="clearCheckoutSlipFile"
                    >
                      ล้างไฟล์
                    </button>
                  </div>
                  <p class="mt-2 text-xs text-neutral-500">รองรับไฟล์ PNG, JPG, WEBP</p>
                  <template v-if="checkoutSlipFile">
                    <p class="mt-1 text-xs font-medium text-[#166534]">ไฟล์ที่เลือก: {{ checkoutSlipFile.name }}</p>
                  </template>
                  <template v-else>
                    <p class="text-xs text-red-500">ต้องแนบสลิปก่อนกดยืนยันคำสั่งซื้อ</p>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button class="flex-1 ns-ui-btn ns-ui-btn-secondary" @click="step = 'address'">
            ← ย้อนกลับ
          </button>
          <button
            :disabled="!canSubmitOrder"
            class="flex-1 ns-ui-btn ns-ui-btn-primary disabled:opacity-60 gap-2"
            @click="handleSubmit"
          >
            <svg v-if="submitting" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ submitting || uploadingCheckoutSlip ? 'กำลังส่งคำสั่ง...' : 'ยืนยันสั่งบายศรี (' + paymentChoiceLabel + ')' }}
          </button>
        </div>
      </div>
    </UContainer>
  </div>
</template>
