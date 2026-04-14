<script setup lang="ts">
definePageMeta({ layout: 'customer-auth' })

useSeoMeta({ title: 'สมัครสมาชิก - Nakarin Studio' })

const { register, getGenders, getPrefixesByGenderId } = useCustomerAuth()
const toast = useAppToast()

const form = reactive({
  genderId: '',
  prefixId: '',
  firstName: '',
  lastName: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  genderId: '',
  prefixId: '',
  firstName: '',
  lastName: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const loadingOptions = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

type Option = { id: string; name: string }
const genders = ref<Option[]>([])
const prefixes = ref<Option[]>([])

const normalizePhone = (v: string) => v.replace(/\D/g, '')

const loadGenders = async () => {
  loadingOptions.value = true
  try {
    genders.value = await getGenders()
  } finally {
    loadingOptions.value = false
  }
}

watch(() => form.genderId, async (id) => {
  prefixes.value = []
  form.prefixId = ''
  if (!id) return
  prefixes.value = await getPrefixesByGenderId(id)
})

onMounted(loadGenders)

const validate = () => {
  Object.keys(errors).forEach(k => ((errors as Record<string, string>)[k] = ''))
  let valid = true
  if (!form.genderId) { errors.genderId = 'กรุณาเลือกเพศ'; valid = false }
  if (!form.prefixId) { errors.prefixId = 'กรุณาเลือกคำนำหน้า'; valid = false }
  if (!form.firstName.trim()) { errors.firstName = 'กรุณากรอกชื่อ'; valid = false }
  if (!form.lastName.trim()) { errors.lastName = 'กรุณากรอกนามสกุล'; valid = false }
  if (!form.phone) { errors.phone = 'กรุณากรอกเบอร์โทรศัพท์'; valid = false }
  else if (normalizePhone(form.phone).length < 9) { errors.phone = 'เบอร์โทรศัพท์ไม่ถูกต้อง'; valid = false }
  if (!form.password) { errors.password = 'กรุณากรอกรหัสผ่าน'; valid = false }
  else if (form.password.length < 8) { errors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'; valid = false }
  if (!form.confirmPassword) { errors.confirmPassword = 'กรุณายืนยันรหัสผ่าน'; valid = false }
  else if (form.password !== form.confirmPassword) { errors.confirmPassword = 'รหัสผ่านไม่ตรงกัน'; valid = false }
  return valid
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const asString = (v: unknown) => (typeof v === 'string' ? v : '')
const parseApiCode = (error: unknown) =>
  asString(asRecord(asRecord(error).data)?.code) || asString(asRecord(asRecord(error).response)?.code) || ''

const handleSubmit = async () => {
  if (!validate()) return
  loading.value = true
  try {
    await register({
      genderId: form.genderId,
      prefixId: form.prefixId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizePhone(form.phone),
      password: form.password,
    })
    toast.success('สมัครสมาชิกสำเร็จ')
    await navigateTo('/')
  } catch (error) {
    const code = parseApiCode(error)
    if (code === 'register-phone-already-used') {
      errors.phone = 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว'
    } else {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  } finally {
    loading.value = false
  }
}

const inputCls = (hasError: boolean) =>
  `w-full rounded-xl border pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-neutral-400 bg-white ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
      : 'border-neutral-200 focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10'
  }`

const genderOptions = computed(() => genders.value.map(g => ({ label: g.name, value: g.id })))
const prefixOptions = computed(() => prefixes.value.map(p => ({ label: p.name, value: p.id })))
</script>

<template>
  <div class="h-screen flex overflow-hidden">
    <!-- Left panel -->
    <div class="hidden lg:flex lg:w-[38%] xl:w-[34%] relative flex-col justify-between bg-[#166534] px-12 py-10 overflow-hidden shrink-0 h-full">
      <div class="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-white/5" />
      <div class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-white/10" />
      <div class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-white/5" />

      <NuxtLink to="/" class="relative flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center text-base font-extrabold">N</div>
        <span class="font-bold text-white tracking-widest text-sm uppercase">Nakarin Studio</span>
      </NuxtLink>

      <div class="relative space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.4" stroke="currentColor" class="w-8 h-8 text-white">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c-4.444 0-8 3.582-8 8 0 2.07.782 3.958 2.065 5.39L12 21l5.935-4.61A7.96 7.96 0 0 0 20 11c0-4.418-3.556-8-8-8Z" />
          </svg>
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-bold text-white leading-snug">เริ่มสั่งบายศรี<br />ได้ทันทีหลังสมัคร</h2>
          <p class="text-[#bbf7d0]/70 text-sm leading-relaxed max-w-[220px]">
            สมัครครั้งเดียว ติดตามออเดอร์ได้ตลอด
          </p>
        </div>
        <div class="pt-2 space-y-3">
          <div v-for="step in ['กรอกข้อมูลที่นี่', 'เลือกบายศรีที่ต้องการ', 'รอปักออเดอร์ถึงงาน']" :key="step" class="flex items-center gap-3 text-sm text-white/80">
            <div class="w-1.5 h-1.5 rounded-full bg-[#bbf7d0] shrink-0" />
            {{ step }}
          </div>
        </div>
      </div>

      <p class="relative text-xs text-white/30">© {{ new Date().getFullYear() }} Nakarin Studio</p>
    </div>

    <!-- Right panel -->
    <div class="flex-1 bg-neutral-50 flex flex-col h-full overflow-y-auto">
      <!-- Mobile topbar -->
      <div class="lg:hidden flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-white sticky top-0 z-10">
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#166534] text-white flex items-center justify-center text-xs font-extrabold">N</div>
          <span class="font-bold text-sm text-[#166534] uppercase tracking-wide">Nakarin Studio</span>
        </NuxtLink>
        <NuxtLink to="/" class="text-xs text-neutral-400 hover:text-[#166534] transition-colors">กลับหน้าหลัก</NuxtLink>
      </div>

      <!-- Desktop back link (top) -->
      <div class="hidden lg:flex items-center px-10 pt-6 shrink-0">
        <NuxtLink to="/" class="text-xs text-neutral-400 hover:text-[#166534] transition-colors flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
            <path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" />
          </svg>
          กลับหน้าหลัก
        </NuxtLink>
      </div>

      <!-- Form -->
      <div class="flex-1 flex items-start lg:items-center justify-center px-5 py-10">
        <div class="w-full max-w-[480px] space-y-7">
          <!-- Heading -->
          <div class="space-y-1.5">
            <h1 class="text-2xl font-bold text-neutral-900 tracking-tight">สมัครสมาชิก</h1>
            <p class="text-sm text-neutral-500">กรอกข้อมูลเพื่อเริ่มสั่งบายศรีได้เลย</p>
          </div>

          <form class="space-y-5" @submit.prevent="handleSubmit">
            <!-- Section: ข้อมูลส่วนตัว -->
            <div class="space-y-3">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">ข้อมูลส่วนตัว</p>

              <!-- Gender + Prefix -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-neutral-700">เพศ</label>
                  <BaseSelectDropdown
                    v-model="form.genderId"
                    :options="genderOptions"
                    :disabled="loadingOptions"
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
                    :disabled="!form.genderId || loadingOptions"
                    placeholder="เลือกคำนำหน้า"
                    :button-class="errors.prefixId ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-neutral-200 hover:border-neutral-300 focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10'"
                  />
                  <p v-if="errors.prefixId" class="text-xs text-red-500">{{ errors.prefixId }}</p>
                </div>
              </div>

              <!-- Name row -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-neutral-700">ชื่อ</label>
                  <div class="relative">
                    <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>
                    </span>
                    <input v-model="form.firstName" type="text" placeholder="ชื่อ" autocomplete="given-name" :class="inputCls(!!errors.firstName)" />
                  </div>
                  <p v-if="errors.firstName" class="text-xs text-red-500">{{ errors.firstName }}</p>
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-neutral-700">นามสกุล</label>
                  <div class="relative">
                    <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>
                    </span>
                    <input v-model="form.lastName" type="text" placeholder="นามสกุล" autocomplete="family-name" :class="inputCls(!!errors.lastName)" />
                  </div>
                  <p v-if="errors.lastName" class="text-xs text-red-500">{{ errors.lastName }}</p>
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-neutral-200" />

            <!-- Section: บัญชี -->
            <div class="space-y-3">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">บัญชีและรหัสผ่าน</p>

              <!-- Phone -->
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-neutral-700">เบอร์โทรศัพท์</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clip-rule="evenodd" /></svg>
                  </span>
                  <input v-model="form.phone" type="tel" placeholder="0812345678" autocomplete="tel" :class="inputCls(!!errors.phone)" />
                </div>
                <p v-if="errors.phone" class="text-xs text-red-500">{{ errors.phone }}</p>
              </div>

              <!-- Password -->
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-neutral-700">รหัสผ่าน</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" /></svg>
                  </span>
                  <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="อย่างน้อย 8 ตัวอักษร" autocomplete="new-password" :class="inputCls(!!errors.password)" class="pr-11" />
                  <button type="button" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors" @click="showPassword = !showPassword">
                    <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.374l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clip-rule="evenodd" /><path d="m10.748 13.93 2.523 2.523a10.003 10.003 0 0 1-6.542-.827l1.717-1.717a2.5 2.5 0 0 0 2.302.021Zm3.287-2.43 1.09 1.09a10.003 10.003 0 0 0 1.404-2.163 1.651 1.651 0 0 0 0-1.185 10.004 10.004 0 0 0-3.81-4.612l1.315-1.315Z" /></svg>
                  </button>
                </div>
                <p v-if="errors.password" class="text-xs text-red-500">{{ errors.password }}</p>
              </div>

              <!-- Confirm Password -->
              <div class="space-y-1.5">
                <label class="text-sm font-medium text-neutral-700">ยืนยันรหัสผ่าน</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" /></svg>
                  </span>
                  <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="••••••••" autocomplete="new-password" :class="inputCls(!!errors.confirmPassword)" class="pr-11" />
                  <button type="button" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors" @click="showConfirmPassword = !showConfirmPassword">
                    <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.374l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clip-rule="evenodd" /><path d="m10.748 13.93 2.523 2.523a10.003 10.003 0 0 1-6.542-.827l1.717-1.717a2.5 2.5 0 0 0 2.302.021Zm3.287-2.43 1.09 1.09a10.003 10.003 0 0 0 1.404-2.163 1.651 1.651 0 0 0 0-1.185 10.004 10.004 0 0 0-3.81-4.612l1.315-1.315Z" /></svg>
                  </button>
                </div>
                <p v-if="errors.confirmPassword" class="text-xs text-red-500">{{ errors.confirmPassword }}</p>
              </div>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full rounded-xl bg-[#166534] py-3 text-sm font-semibold text-white hover:bg-[#14532d] active:scale-[0.99] transition-all shadow-[0_8px_20px_-8px_rgba(22,101,52,0.6)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก' }}
            </button>
          </form>

          <p class="text-center text-sm text-neutral-500 pb-4">
            มีบัญชีแล้ว?
            <NuxtLink to="/auth/login" class="font-semibold text-[#166534] hover:underline">เข้าสู่ระบบ</NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

