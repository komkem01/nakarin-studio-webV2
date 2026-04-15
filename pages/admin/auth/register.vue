<script setup lang="ts">
import { useAppToast } from '~/composables/useAppToast'

definePageMeta({
  layout: 'admin-auth',
})

useSeoMeta({
  title: 'ลงทะเบียน - Nakarin Studio Admin',
})

const { getGenders, getPrefixesByGenderId, registerAdmin, checkPhoneDuplicate } = useAdminAuthApi()
const toast = useAppToast()

const form = reactive({
  phone: '',
  genderId: '',
  prefixId: '',
  firstName: '',
  lastName: '',
  role: 'admin',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  phone: '',
  genderId: '',
  prefixId: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  general: '',
})

const loading = ref(false)
const loadingOptions = ref(false)
const loadingPrefixes = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const checkingPhone = ref(false)
const checkPhoneScheduled = ref(false)
const phoneChecked = ref(false)
const isDuplicatePhone = ref(false)
const phoneLocked = ref(false)
const phoneCheckMessage = ref('')
let checkPhoneTimer: ReturnType<typeof setTimeout> | null = null

const genders = ref<Array<{ id: string, name: string }>>([])
const prefixes = ref<Array<{ id: string, name: string }>>([])
const genderOptions = computed(() => genders.value.map(item => ({ label: item.name, value: item.id })))
const prefixOptions = computed(() => prefixes.value.map(item => ({ label: item.name, value: item.id })))
const canFillMoreFields = computed(() => phoneChecked.value && !isDuplicatePhone.value)
const phoneStatusClass = computed(() => {
  if (isDuplicatePhone.value) return 'text-red-500'
  if (phoneChecked.value) return 'text-[#166534]'
  return 'text-neutral-500'
})

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '')

const formatPhoneDisplay = (value: string) => {
  const digits = normalizePhone(value).slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

const handlePhoneInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const masked = formatPhoneDisplay(input.value)
  form.phone = masked
  input.value = masked
}

const parseApiCode = (error: unknown) => {
  const e = error as { data?: { code?: string } }
  return e?.data?.code || ''
}

const validatePhoneOnly = () => {
  errors.phone = ''
  if (!form.phone) {
    errors.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    return false
  }
  if (!/^0[0-9]{8,9}$/.test(normalizePhone(form.phone))) {
    errors.phone = 'รูปแบบเบอร์โทรไม่ถูกต้อง'
    return false
  }
  return true
}

const validateAll = () => {
  errors.phone = ''
  errors.genderId = ''
  errors.prefixId = ''
  errors.firstName = ''
  errors.lastName = ''
  let valid = true

  if (!validatePhoneOnly()) {
    valid = false
  }

  if (!canFillMoreFields.value) {
    errors.phone = 'กรุณาตรวจสอบเบอร์โทรศัพท์ก่อนลงทะเบียน'
    valid = false
  }

  if (!form.firstName.trim()) {
    errors.firstName = 'กรุณากรอกชื่อ'
    valid = false
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'กรุณากรอกนามสกุล'
    valid = false
  }

  if (!form.genderId) {
    errors.genderId = 'กรุณาเลือกเพศ'
    valid = false
  }

  if (!form.prefixId) {
    errors.prefixId = 'กรุณาเลือกคำนำหน้า'
    valid = false
  }

  errors.password = ''
  errors.confirmPassword = ''

  if (!form.password) {
    errors.password = 'กรุณากรอกรหัสผ่าน'
    valid = false
  } else if (form.password.length < 8) {
    errors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    valid = false
  } else if (!/(?=.*[a-z])(?=.*[A-Z])|(?=.*\d)/.test(form.password)) {
    errors.password = 'รหัสผ่านควรมีตัวอักษรและตัวเลข'
    valid = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'กรุณายืนยันรหัสผ่าน'
    valid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'รหัสผ่านไม่ตรงกัน'
    valid = false
  }

  return valid
}

const passwordStrength = computed(() => {
  const p = form.password
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const s = passwordStrength.value
  if (s <= 1) return { text: 'อ่อนมาก', color: 'bg-red-400' }
  if (s === 2) return { text: 'อ่อน', color: 'bg-orange-400' }
  if (s === 3) return { text: 'ปานกลาง', color: 'bg-yellow-400' }
  if (s === 4) return { text: 'ดี', color: 'bg-[#22c55e]' }
  return { text: 'แข็งแกร่ง', color: 'bg-[#166534]' }
})

const checkPhone = async () => {
  errors.general = ''
  phoneCheckMessage.value = ''
  phoneChecked.value = false
  isDuplicatePhone.value = false
  phoneLocked.value = false

  if (!validatePhoneOnly()) return

  checkingPhone.value = true
  try {
    const isDuplicate = await checkPhoneDuplicate({ phone: normalizePhone(form.phone) })
    isDuplicatePhone.value = isDuplicate
    phoneChecked.value = true
    phoneLocked.value = !isDuplicate
    phoneCheckMessage.value = isDuplicate
      ? 'เบอร์นี้ถูกใช้งานแล้ว'
      : 'เบอร์นี้สามารถใช้งานได้'
    if (isDuplicate) {
      toast.error('เบอร์นี้ถูกใช้งานแล้ว')
    } else {
      toast.success('เบอร์นี้สามารถใช้งานได้')
    }
  } catch {
    errors.general = 'ไม่สามารถตรวจสอบเบอร์ได้ กรุณาลองใหม่อีกครั้ง'
    toast.error('ไม่สามารถตรวจสอบเบอร์ได้ กรุณาลองใหม่อีกครั้ง')
  } finally {
    checkingPhone.value = false
  }
}

const checkPhoneDebounced = () => {
  if (checkPhoneTimer) clearTimeout(checkPhoneTimer)
  checkPhoneScheduled.value = true
  checkPhoneTimer = setTimeout(async () => {
    checkPhoneScheduled.value = false
    await checkPhone()
  }, 450)
}

const unlockPhoneForEdit = () => {
  phoneLocked.value = false
  phoneChecked.value = false
  isDuplicatePhone.value = false
  phoneCheckMessage.value = ''
}

const handleSubmit = async () => {
  if (!validateAll()) return

  loading.value = true
  try {
    await registerAdmin({
      genderId: form.genderId,
      prefixId: form.prefixId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizePhone(form.phone),
      password: form.password,
    })

    toast.success('ลงทะเบียนสำเร็จแล้ว กรุณาเข้าสู่ระบบ')
    await new Promise(resolve => setTimeout(resolve, 500))
    await navigateTo(`/admin/auth/login?phone=${encodeURIComponent(normalizePhone(form.phone))}&registered=1`)
  } catch (error) {
    const code = parseApiCode(error)
    if (code === 'register-phone-already-used') {
      errors.general = 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว'
      toast.error('เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว')
      phoneChecked.value = true
      isDuplicatePhone.value = true
      phoneLocked.value = false
      phoneCheckMessage.value = 'เบอร์นี้ถูกใช้งานแล้ว'
      return
    }
    if (code === 'invalid-register-data' || code === 'invalid-request-form') {
      errors.general = 'ข้อมูลลงทะเบียนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
      toast.error('ข้อมูลลงทะเบียนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง')
      return
    }
    errors.general = 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง'
    toast.error('ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}

const fetchInitialOptions = async () => {
  loadingOptions.value = true
  errors.general = ''
  try {
    genders.value = await getGenders()

    if (!genders.value.length) {
      errors.general = 'ไม่พบข้อมูลเพศในระบบ'
      toast.error('ไม่พบข้อมูลเพศในระบบ')
      return
    }

    form.genderId = genders.value[0].id
    prefixes.value = await getPrefixesByGenderId(form.genderId)

    if (!prefixes.value.length) {
      errors.general = 'ไม่พบข้อมูลคำนำหน้าในระบบ'
      toast.error('ไม่พบข้อมูลคำนำหน้าในระบบ')
      return
    }

    form.prefixId = prefixes.value[0].id
  } catch {
    errors.general = 'ไม่สามารถโหลดข้อมูลพื้นฐานสำหรับลงทะเบียนได้'
    toast.error('ไม่สามารถโหลดข้อมูลพื้นฐานสำหรับลงทะเบียนได้')
  } finally {
    loadingOptions.value = false
  }
}

watch(() => form.genderId, async (genderId) => {
  errors.prefixId = ''
  prefixes.value = []
  form.prefixId = ''

  if (!genderId) {
    return
  }

  loadingPrefixes.value = true
  try {
    prefixes.value = await getPrefixesByGenderId(genderId)
    form.prefixId = prefixes.value[0]?.id || ''
  } catch {
    prefixes.value = []
    form.prefixId = ''
    errors.general = 'ไม่สามารถโหลดข้อมูลคำนำหน้าได้'
    toast.error('ไม่สามารถโหลดข้อมูลคำนำหน้าได้')
  } finally {
    loadingPrefixes.value = false
  }
})

watch(() => form.phone, () => {
  if (phoneLocked.value) return
  phoneChecked.value = false
  isDuplicatePhone.value = false
  phoneCheckMessage.value = ''
})

onMounted(fetchInitialOptions)

onBeforeUnmount(() => {
  if (checkPhoneTimer) clearTimeout(checkPhoneTimer)
})

const inputCls = (hasError: boolean) =>
  `w-full rounded-xl border pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-neutral-400 bg-white ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
      : 'border-neutral-200 focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10'
  }`
</script>

<template>
  <div class="h-screen flex overflow-hidden">
    <div class="hidden lg:flex lg:w-[38%] xl:w-[34%] relative flex-col justify-between bg-[#166534] px-12 py-10 overflow-hidden shrink-0 h-full">
      <div class="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-white/10" />
      <div class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-white/5" />

      <NuxtLink to="/admin/auth/login" class="relative flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center text-base font-extrabold">N</div>
        <span class="font-bold text-white tracking-widest text-sm uppercase">Nakarin Studio</span>
      </NuxtLink>

      <div class="relative space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.4" stroke="currentColor" class="w-8 h-8 text-white">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 7.5v-1a4.5 4.5 0 1 0-9 0v1M5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75v9A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75v-9A2.25 2.25 0 0 1 5.25 7.5Z" />
          </svg>
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-bold text-white leading-snug">สมัครผู้ดูแลระบบ<br />Nakarin Studio</h2>
          <p class="text-[#bbf7d0]/70 text-sm leading-relaxed max-w-[260px]">
            ตรวจสอบเบอร์โทรก่อน จากนั้นกรอกข้อมูลเพื่อสร้างบัญชีแอดมิน
          </p>
        </div>
        <div class="pt-2 space-y-3">
          <div v-for="step in ['ตรวจสอบเบอร์โทรศัพท์', 'กรอกข้อมูลผู้ดูแลระบบ', 'ตั้งรหัสผ่านและเริ่มใช้งาน']" :key="step" class="flex items-center gap-3 text-sm text-white/80">
            <div class="w-1.5 h-1.5 rounded-full bg-[#bbf7d0] shrink-0" />
            {{ step }}
          </div>
        </div>
      </div>

      <p class="relative text-xs text-white/30">สำหรับผู้ดูแลระบบเท่านั้น</p>
    </div>

    <div class="flex-1 bg-neutral-50 flex flex-col h-full overflow-y-auto">
      <div class="lg:hidden flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-white sticky top-0 z-10">
        <NuxtLink to="/admin/auth/login" class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#166534] text-white flex items-center justify-center text-xs font-extrabold">N</div>
          <span class="font-bold text-sm text-[#166534] uppercase tracking-wide">Nakarin Studio</span>
        </NuxtLink>
        <NuxtLink to="/admin/auth/login" class="text-xs text-neutral-400 hover:text-[#166534] transition-colors">กลับหน้าเข้าสู่ระบบ</NuxtLink>
      </div>

      <div class="hidden lg:flex items-center px-10 pt-6 shrink-0">
        <NuxtLink to="/admin/auth/login" class="text-xs text-neutral-400 hover:text-[#166534] transition-colors flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
            <path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" />
          </svg>
          กลับหน้าเข้าสู่ระบบ
        </NuxtLink>
      </div>

      <div class="flex-1 flex items-start lg:items-center justify-center px-5 py-10">
        <div class="w-full max-w-[520px] space-y-7">
          <div class="space-y-1.5">
            <h1 class="text-2xl font-bold text-neutral-900 tracking-tight">ลงทะเบียนผู้ดูแลระบบ</h1>
            <p class="text-sm text-neutral-500">ดีไซน์เดียวกับหน้าลูกค้า พร้อมขั้นตอนตรวจสอบเบอร์ก่อนสร้างบัญชี</p>
          </div>

          <div
            v-if="errors.general"
            class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {{ errors.general }}
          </div>

          <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
            <div class="space-y-3">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">ตรวจสอบเบอร์โทร</p>

              <div class="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-neutral-700">ขั้นตอนที่ 1</p>
                  <span class="text-[11px] px-2.5 py-1 rounded-full border" :class="phoneChecked ? 'border-[#166534]/30 text-[#166534] bg-[#166534]/5' : 'border-neutral-300 text-neutral-500 bg-white'">
                    {{ phoneChecked ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ' }}
                  </span>
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-neutral-700">เบอร์โทรศัพท์</label>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <div class="relative flex-1">
                      <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clip-rule="evenodd" /></svg>
                      </span>
                      <input
                        id="phone"
                        v-model="form.phone"
                        name="phone"
                        type="tel"
                        inputmode="numeric"
                        maxlength="12"
                        placeholder="08x-xxx-xxxx"
                        autocomplete="tel"
                        :class="inputCls(!!errors.phone)"
                        :disabled="phoneLocked || checkingPhone || checkPhoneScheduled"
                        @input="handlePhoneInput"
                      />
                    </div>

                    <button
                      type="button"
                      class="px-4 py-3 rounded-xl bg-[#166534] text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                      :disabled="checkingPhone || checkPhoneScheduled || loading"
                      @click="checkPhoneDebounced"
                    >
                      {{ checkingPhone || checkPhoneScheduled ? 'กำลังตรวจสอบ...' : 'ตรวจสอบเบอร์' }}
                    </button>
                    <button
                      v-if="phoneLocked"
                      type="button"
                      class="px-4 py-3 rounded-xl border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50 whitespace-nowrap"
                      @click="unlockPhoneForEdit"
                    >
                      แก้ไขเบอร์
                    </button>
                  </div>
                  <p v-if="errors.phone" class="text-xs text-red-500" role="alert">{{ errors.phone }}</p>
                  <p v-if="phoneCheckMessage" class="text-xs font-medium" :class="phoneStatusClass">{{ phoneCheckMessage }}</p>
                </div>
              </div>
            </div>

            <div class="border-t border-neutral-200" />

            <div class="space-y-3">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">ข้อมูลผู้ดูแลระบบ</p>

              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-neutral-700">เพศ</label>
                  <BaseSelectDropdown
                    v-model="form.genderId"
                    :options="genderOptions"
                    :disabled="loadingOptions || !canFillMoreFields"
                    placeholder="เลือกเพศ"
                    :button-class="errors.genderId ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-neutral-200 hover:border-neutral-300 focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10'"
                  />
                  <p v-if="errors.genderId" class="text-xs text-red-500">{{ errors.genderId }}</p>
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-neutral-700">คำนำหน้า</label>
                  <BaseSelectDropdown
                    v-model="form.prefixId"
                    :options="prefixOptions"
                    :disabled="loadingOptions || loadingPrefixes || !canFillMoreFields || !form.genderId"
                    placeholder="เลือกคำนำหน้า"
                    :button-class="errors.prefixId ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-neutral-200 hover:border-neutral-300 focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10'"
                  />
                  <p v-if="loadingPrefixes" class="text-xs text-neutral-500">กำลังโหลดคำนำหน้า...</p>
                  <p v-if="errors.prefixId" class="text-xs text-red-500">{{ errors.prefixId }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-neutral-700">ชื่อ</label>
                  <div class="relative">
                    <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>
                    </span>
                    <input v-model="form.firstName" type="text" placeholder="ชื่อ" autocomplete="given-name" :disabled="!canFillMoreFields" :class="inputCls(!!errors.firstName)" />
                  </div>
                  <p v-if="errors.firstName" class="text-xs text-red-500">{{ errors.firstName }}</p>
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-neutral-700">นามสกุล</label>
                  <div class="relative">
                    <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>
                    </span>
                    <input v-model="form.lastName" type="text" placeholder="นามสกุล" autocomplete="family-name" :disabled="!canFillMoreFields" :class="inputCls(!!errors.lastName)" />
                  </div>
                  <p v-if="errors.lastName" class="text-xs text-red-500">{{ errors.lastName }}</p>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium text-neutral-700">Role</label>
                <input
                  id="role"
                  :value="form.role"
                  type="text"
                  disabled
                  class="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm bg-neutral-100 text-neutral-600"
                />
              </div>
            </div>

            <div class="border-t border-neutral-200" />

            <div class="space-y-3">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">รหัสผ่าน</p>

              <div class="space-y-1.5">
                <label class="text-sm font-medium text-neutral-700">รหัสผ่าน</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" /></svg>
                  </span>
                  <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="อย่างน้อย 8 ตัวอักษร" autocomplete="new-password" :disabled="!canFillMoreFields" :class="inputCls(!!errors.password)" class="pr-11" />
                  <button type="button" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :disabled="!canFillMoreFields" @click="showPassword = !showPassword">
                    <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.374l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clip-rule="evenodd" /><path d="m10.748 13.93 2.523 2.523a10.003 10.003 0 0 1-6.542-.827l1.717-1.717a2.5 2.5 0 0 0 2.302.021Zm3.287-2.43 1.09 1.09a10.003 10.003 0 0 0 1.404-2.163 1.651 1.651 0 0 0 0-1.185 10.004 10.004 0 0 0-3.81-4.612l1.315-1.315Z" /></svg>
                  </button>
                </div>
                <div v-if="form.password" class="space-y-1">
                  <div class="flex gap-1">
                    <div v-for="i in 5" :key="i" class="h-1 flex-1 rounded-full transition-all duration-300" :class="i <= passwordStrength ? strengthLabel.color : 'bg-neutral-200'" />
                  </div>
                  <p class="text-xs text-neutral-500">ความแข็งแกร่ง: <span class="font-medium text-[#166534]">{{ strengthLabel.text }}</span></p>
                </div>
                <p v-if="errors.password" class="text-xs text-red-500">{{ errors.password }}</p>
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium text-neutral-700">ยืนยันรหัสผ่าน</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" /></svg>
                  </span>
                  <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="••••••••" autocomplete="new-password" :disabled="!canFillMoreFields" :class="inputCls(!!errors.confirmPassword)" class="pr-11" />
                  <button type="button" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :disabled="!canFillMoreFields" @click="showConfirmPassword = !showConfirmPassword">
                    <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.374l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clip-rule="evenodd" /><path d="m10.748 13.93 2.523 2.523a10.003 10.003 0 0 1-6.542-.827l1.717-1.717a2.5 2.5 0 0 0 2.302.021Zm3.287-2.43 1.09 1.09a10.003 10.003 0 0 0 1.404-2.163 1.651 1.651 0 0 0 0-1.185 10.004 10.004 0 0 0-3.81-4.612l1.315-1.315Z" /></svg>
                  </button>
                </div>
                <p v-if="errors.confirmPassword" class="text-xs text-red-500">{{ errors.confirmPassword }}</p>
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading || checkingPhone || checkPhoneScheduled || loadingOptions || loadingPrefixes"
              class="w-full ns-ui-btn ns-ui-btn-primary active:scale-[0.99] disabled:cursor-not-allowed gap-2"
            >
              <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีผู้ดูแล' }}
            </button>
          </form>

          <p class="text-center text-sm text-neutral-500 pb-4">
            มีบัญชีแล้ว?
            <NuxtLink to="/admin/auth/login" class="font-semibold text-[#166534] hover:underline">เข้าสู่ระบบ</NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
