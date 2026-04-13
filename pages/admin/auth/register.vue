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
  if (!genderId) {
    prefixes.value = []
    form.prefixId = ''
    return
  }

  try {
    prefixes.value = await getPrefixesByGenderId(genderId)
    if (!prefixes.value.some(item => item.id === form.prefixId)) {
      form.prefixId = prefixes.value[0]?.id || ''
    }
  } catch {
    prefixes.value = []
    form.prefixId = ''
    errors.general = 'ไม่สามารถโหลดข้อมูลคำนำหน้าได้'
    toast.error('ไม่สามารถโหลดข้อมูลคำนำหน้าได้')
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
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-white">
    <!-- Left panel -->
    <div class="hidden lg:flex lg:w-5/12 h-screen lg:sticky lg:top-0 bg-[#14532d] flex-col justify-between p-14 relative overflow-hidden">
      <!-- Grid pattern overlay -->
      <div
        class="absolute inset-0 opacity-[0.06]"
        style="background-image: linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px); background-size: 48px 48px;"
      />
      <!-- Top: brand -->
      <div class="relative">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-9 h-9 bg-white/10 border border-white/20">
            <span class="text-white text-base font-extrabold leading-none tracking-tight">N</span>
          </div>
          <div>
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-white">Nakarin Studio</p>
            <p class="text-xs text-white/50 tracking-wide">Management System</p>
          </div>
        </div>
      </div>
      <!-- Middle: headline -->
      <div class="relative space-y-8">
        <div>
          <div class="w-10 h-0.5 bg-white/40 mb-6" />
          <h2 class="text-3xl font-bold text-white leading-snug tracking-tight">
            ลงทะเบียนบัญชี<br />Nakarin Studio
          </h2>
          <p class="text-sm text-white/60 mt-3 leading-relaxed">
            ตรวจสอบเบอร์โทรก่อน จากนั้นกรอกข้อมูล
            เพื่อสร้างบัญชีผู้ดูแลระบบ
          </p>
        </div>
      </div>
      <!-- Bottom: notice -->
      <div class="relative border-t border-white/20 pt-5">
        <p class="text-xs text-white/40 tracking-wide uppercase">สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    </div>

    <!-- Right form panel -->
    <div class="flex-1 h-screen overflow-y-auto flex items-start justify-center p-6 sm:p-10 lg:p-14">
      <div class="w-full max-w-xl">
        <AdminAuthAuthBrand
          title="ลงทะเบียน Admin"
          subtitle="กรอกเบอร์และตรวจสอบก่อน แล้วจึงกรอกข้อมูลส่วนที่เหลือ"
        />

        <!-- General error -->
        <div
          v-if="errors.general"
          class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-5"
          role="alert"
        >
          {{ errors.general }}
        </div>

        <form class="space-y-5 border border-neutral-200 rounded-2xl p-5 sm:p-7 shadow-[0_16px_36px_-20px_rgba(21,128,61,0.45)]" novalidate @submit.prevent="handleSubmit">
          <div v-if="loadingOptions" class="text-xs text-neutral-500">กำลังโหลดข้อมูลเพศและคำนำหน้า...</div>

          <div class="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold uppercase tracking-widest text-neutral-600">ขั้นตอนที่ 1</p>
              <span class="text-[11px] px-2.5 py-1 rounded-full border" :class="phoneChecked ? 'border-[#166534]/30 text-[#166534] bg-[#166534]/5' : 'border-neutral-300 text-neutral-500 bg-white'">
                {{ phoneChecked ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบเบอร์' }}
              </span>
            </div>
            <p class="text-sm text-neutral-600">ตรวจสอบเบอร์โทรก่อน เพื่อปลดล็อกการกรอกข้อมูลถัดไป</p>

            <div class="flex flex-col gap-1.5">
              <label for="phone" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                เบอร์โทรศัพท์ <span class="text-[#166534]">*</span>
              </label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  id="phone"
                  v-model="form.phone"
                  name="phone"
                  type="tel"
                  inputmode="numeric"
                  maxlength="12"
                  placeholder="08x-xxx-xxxx"
                  autocomplete="tel"
                  class="flex-1 w-full px-3.5 py-3 rounded border text-sm bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition
                    focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]"
                  :class="errors.phone ? 'border-red-400' : 'border-neutral-400'"
                  :disabled="phoneLocked || checkingPhone || checkPhoneScheduled"
                  @input="handlePhoneInput"
                />
                <button
                  type="button"
                  class="px-4 py-3 rounded bg-[#166534] text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                  :disabled="checkingPhone || checkPhoneScheduled || loading"
                  @click="checkPhoneDebounced"
                >
                  {{ checkingPhone || checkPhoneScheduled ? 'กำลังตรวจสอบ...' : 'ตรวจสอบเบอร์' }}
                </button>
                <button
                  v-if="phoneLocked"
                  type="button"
                  class="px-4 py-3 rounded border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50 whitespace-nowrap"
                  @click="unlockPhoneForEdit"
                >
                  แก้ไขเบอร์
                </button>
              </div>
              <p v-if="errors.phone" class="text-xs text-red-500" role="alert">{{ errors.phone }}</p>
              <p v-if="phoneCheckMessage" class="text-xs font-medium" :class="phoneStatusClass">
                {{ phoneCheckMessage }}
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-neutral-200 p-4 space-y-4">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold uppercase tracking-widest text-neutral-600">ขั้นตอนที่ 2</p>
              <span class="text-[11px] px-2.5 py-1 rounded-full border"
                :class="canFillMoreFields ? 'border-[#166534]/30 text-[#166534] bg-[#166534]/5' : 'border-neutral-300 text-neutral-500 bg-white'">
                {{ canFillMoreFields ? 'พร้อมกรอกข้อมูล' : 'ล็อกจนกว่าจะตรวจสอบเบอร์' }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label for="genderId" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                  เพศ <span class="text-[#166534]">*</span>
                </label>
                <select
                  id="genderId"
                  v-model="form.genderId"
                  name="genderId"
                  class="w-full px-3.5 py-3 rounded border text-sm bg-white text-neutral-900 outline-none transition
                    focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]
                    disabled:bg-neutral-50 disabled:text-neutral-400"
                  :class="errors.genderId ? 'border-red-400' : 'border-neutral-400'"
                  :disabled="loadingOptions || !canFillMoreFields"
                >
                  <option value="" disabled>เลือกเพศ</option>
                  <option v-for="opt in genderOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <p v-if="errors.genderId" class="text-xs text-red-500" role="alert">{{ errors.genderId }}</p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="prefixId" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                  คำนำหน้า <span class="text-[#166534]">*</span>
                </label>
                <select
                  id="prefixId"
                  v-model="form.prefixId"
                  name="prefixId"
                  class="w-full px-3.5 py-3 rounded border text-sm bg-white text-neutral-900 outline-none transition
                    focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]
                    disabled:bg-neutral-50 disabled:text-neutral-400"
                  :class="errors.prefixId ? 'border-red-400' : 'border-neutral-400'"
                  :disabled="loadingOptions || !canFillMoreFields || !form.genderId"
                >
                  <option value="" disabled>เลือกคำนำหน้า</option>
                  <option v-for="opt in prefixOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <p v-if="errors.prefixId" class="text-xs text-red-500" role="alert">{{ errors.prefixId }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label for="firstName" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                  ชื่อ <span class="text-[#166534]">*</span>
                </label>
                <input
                  id="firstName"
                  v-model="form.firstName"
                  name="firstName"
                  type="text"
                  placeholder="กรอกชื่อ"
                  autocomplete="given-name"
                  class="w-full px-3.5 py-3 rounded border text-sm bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition
                    focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="errors.firstName ? 'border-red-400' : 'border-neutral-400'"
                  :disabled="!canFillMoreFields"
                />
                <p v-if="errors.firstName" class="text-xs text-red-500" role="alert">{{ errors.firstName }}</p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="lastName" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                  นามสกุล <span class="text-[#166534]">*</span>
                </label>
                <input
                  id="lastName"
                  v-model="form.lastName"
                  name="lastName"
                  type="text"
                  placeholder="กรอกนามสกุล"
                  autocomplete="family-name"
                  class="w-full px-3.5 py-3 rounded border text-sm bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition
                    focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="errors.lastName ? 'border-red-400' : 'border-neutral-400'"
                  :disabled="!canFillMoreFields"
                />
                <p v-if="errors.lastName" class="text-xs text-red-500" role="alert">{{ errors.lastName }}</p>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="role" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">Role</label>
              <input
                id="role"
                :value="form.role"
                type="text"
                disabled
                class="w-full px-3.5 py-3 rounded border border-neutral-300 bg-neutral-100 text-neutral-600 text-sm"
              />
            </div>
          </div>

          <div class="rounded-xl border border-neutral-200 p-4 space-y-4">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold uppercase tracking-widest text-neutral-600">ขั้นตอนที่ 3</p>
              <span class="text-[11px] px-2.5 py-1 rounded-full border"
                :class="canFillMoreFields ? 'border-[#166534]/30 text-[#166534] bg-[#166534]/5' : 'border-neutral-300 text-neutral-500 bg-white'">
                ตั้งค่ารหัสผ่าน
              </span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="password" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                รหัสผ่าน <span class="text-[#166534]">*</span>
              </label>
              <div class="relative">
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  autocomplete="new-password"
                  class="w-full px-3.5 py-3 pr-10 rounded border text-sm bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition
                    focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]"
                  :class="errors.password ? 'border-red-400' : 'border-neutral-400'"
                  :disabled="!canFillMoreFields"
                />
                <button type="button" tabindex="-1"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="!canFillMoreFields"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="showPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <div v-if="form.password" class="space-y-1">
                <div class="flex gap-1">
                  <div
                    v-for="i in 5"
                    :key="i"
                    class="h-1 flex-1 rounded-full transition-all duration-300"
                    :class="i <= passwordStrength ? strengthLabel.color : 'bg-neutral-200'"
                  />
                </div>
                <p class="text-xs text-neutral-500">
                  ความแข็งแกร่ง: <span class="font-medium text-[#166534]">{{ strengthLabel.text }}</span>
                </p>
              </div>
              <p v-if="errors.password" class="text-xs text-red-500" role="alert">{{ errors.password }}</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="confirmPassword" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                ยืนยันรหัสผ่าน <span class="text-[#166534]">*</span>
              </label>
              <div class="relative">
                <input
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  name="confirmPassword"
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  autocomplete="new-password"
                  class="w-full px-3.5 py-3 pr-10 rounded border text-sm bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition
                    focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]"
                  :class="errors.confirmPassword ? 'border-red-400' : 'border-neutral-400'"
                  :disabled="!canFillMoreFields"
                />
                <button type="button" tabindex="-1"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="!canFillMoreFields"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <svg v-if="showConfirmPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <p v-if="errors.confirmPassword" class="text-xs text-red-500" role="alert">{{ errors.confirmPassword }}</p>
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading || checkingPhone || checkPhoneScheduled || loadingOptions"
            class="mt-2 w-full rounded-xl bg-[#166534] py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(22,101,52,0.8)] transition-all duration-200 hover:bg-[#14532d] hover:shadow-[0_14px_28px_-14px_rgba(20,83,45,0.85)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span v-if="loading" class="inline-flex items-center gap-2">
              <span class="loading loading-spinner loading-xs" />
              กำลังสร้างบัญชี...
            </span>
            <span v-else>สร้างบัญชีผู้ดูแล</span>
          </button>
        </form>

        <p class="mt-6 text-center text-xs text-neutral-500">
          มีบัญชีอยู่แล้ว?
          <NuxtLink to="/admin/auth/login" class="text-[#166534] hover:text-[#14532d] font-semibold hover:underline transition-colors ml-1">
            เข้าสู่ระบบ
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
