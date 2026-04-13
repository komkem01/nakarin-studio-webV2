<script setup lang="ts">
import { useToast as useAppToast } from '~/composables/useToast'

definePageMeta({
  layout: 'admin-auth',
})

useSeoMeta({
  title: 'เข้าสู่ระบบ - Nakarin Studio Admin',
})

const { login } = useAdminAuthApi()
const route = useRoute()
const toast = useAppToast()

const form = reactive({
  phone: '',
  password: '',
  remember: false,
})

const errors = reactive({
  phone: '',
  password: '',
  general: '',
})

const loading = ref(false)
const showPassword = ref(false)
const infoMessage = ref('')

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
  const e = error as { data?: { code?: string }, statusCode?: number }
  return e?.data?.code || ''
}

const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})

const getTokenValue = (source: unknown, camel: string, snake: string) => {
  const data = asRecord(source)
  const camelValue = data[camel]
  if (typeof camelValue === 'string' && camelValue.trim()) return camelValue
  const snakeValue = data[snake]
  if (typeof snakeValue === 'string' && snakeValue.trim()) return snakeValue
  return ''
}

const getExpireValue = (source: unknown, camel: string, snake: string, fallback: number) => {
  const data = asRecord(source)
  const raw = data[camel] ?? data[snake]
  const num = Number(raw)
  if (Number.isFinite(num) && num > 0) return num
  return fallback
}

const persistAuthCookies = (accessToken: string, refreshToken: string, remember: boolean, accessExp: number, refreshExp: number) => {
  const accessMaxAge = Number.isFinite(accessExp) && accessExp > 0 ? accessExp : 60 * 60 * 24
  const refreshMaxAge = Number.isFinite(refreshExp) && refreshExp > 0 ? refreshExp : 60 * 60 * 24 * 7

  // Clean old misspelled cookie name if it exists.
  document.cookie = 'accesc_token=; Path=/; Max-Age=0; SameSite=Lax'

  if (remember) {
    document.cookie = `access_token=${encodeURIComponent(accessToken)}; Path=/; Max-Age=${accessMaxAge}; SameSite=Lax`
    document.cookie = `refresh_token=${encodeURIComponent(refreshToken)}; Path=/; Max-Age=${refreshMaxAge}; SameSite=Lax`
    return
  }

  document.cookie = `access_token=${encodeURIComponent(accessToken)}; Path=/; SameSite=Lax`
  document.cookie = `refresh_token=${encodeURIComponent(refreshToken)}; Path=/; SameSite=Lax`
}

const validate = () => {
  errors.phone = ''
  errors.password = ''
  errors.general = ''
  let valid = true

  if (!form.phone) {
    errors.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    valid = false
  } else if (!/^0[0-9]{8,9}$/.test(normalizePhone(form.phone))) {
    errors.phone = 'รูปแบบเบอร์โทรไม่ถูกต้อง'
    valid = false
  }

  if (!form.password) {
    errors.password = 'กรุณากรอกรหัสผ่าน'
    valid = false
  }

  return valid
}

const handleSubmit = async () => {
  if (!validate()) return

  loading.value = true
  try {
    const tokens = await login({
      phone: normalizePhone(form.phone),
      password: form.password,
    })

    if (tokens.member.role !== 'admin') {
      errors.general = 'บัญชีนี้ไม่มีสิทธิ์เข้าระบบผู้ดูแล'
      toast.error('บัญชีนี้ไม่มีสิทธิ์เข้าระบบผู้ดูแล')
      return
    }

    if (import.meta.client) {
      const accessToken = getTokenValue(tokens, 'accessToken', 'access_token')
      const refreshToken = getTokenValue(tokens, 'refreshToken', 'refresh_token')
      const accessExp = getExpireValue(tokens, 'accessTokenExpiresIn', 'access_token_expires_in', 60 * 60 * 24)
      const refreshExp = getExpireValue(tokens, 'refreshTokenExpiresIn', 'refresh_token_expires_in', 60 * 60 * 24 * 7)

      if (!accessToken || !refreshToken) {
        errors.general = 'ระบบตอบกลับ token ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
        toast.error('ระบบตอบกลับ token ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
        return
      }

      const persist = {
        tokenType: tokens.tokenType,
        accessToken,
        refreshToken,
        member: tokens.member,
      }

      persistAuthCookies(
        accessToken,
        refreshToken,
        form.remember,
        accessExp,
        refreshExp,
      )

      if (form.remember) {
        sessionStorage.removeItem('ns_admin_auth')
        localStorage.setItem('ns_admin_auth', JSON.stringify(persist))
      } else {
        localStorage.removeItem('ns_admin_auth')
        sessionStorage.setItem('ns_admin_auth', JSON.stringify(persist))
      }
    }

    await navigateTo('/admin/dashboard')
  } catch (error) {
    const code = parseApiCode(error)
    if (code === 'invalid-credentials' || code === 'invalid-login-data') {
      errors.general = 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง'
      toast.error('เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง')
      return
    }

    const e = error as { statusCode?: number }
    if (!e?.statusCode) {
      errors.general = 'เชื่อมต่อ API ไม่ได้ กรุณาตรวจสอบว่า backend เปิดอยู่ที่ http://localhost:8080'
      toast.error('เชื่อมต่อ API ไม่ได้ กรุณาตรวจสอบ backend')
      return
    }

    errors.general = 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง'
    toast.error('ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const queryPhone = String(route.query.phone || '')
  const registered = String(route.query.registered || '') === '1'

  if (queryPhone) {
    form.phone = formatPhoneDisplay(queryPhone)
  }
  if (registered) {
    infoMessage.value = 'ลงทะเบียนสำเร็จแล้ว กรุณาเข้าสู่ระบบเพื่อใช้งานต่อ'
    toast.success('ลงทะเบียนสำเร็จแล้ว กรุณาเข้าสู่ระบบเพื่อใช้งานต่อ')
  }
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
            <svg class="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2C8 2 5 5 5 8c0 4 4 7 7 10 3-3 7-6 7-10 0-3-2.7-6-7-6z"/>
              <path d="M12 8v4M10 10h4"/>
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-white">Nakarin Studio</p>
            <p class="text-xs text-white/50 tracking-wide">Management System</p>
          </div>
        </div>
      </div>
      <!-- Middle: headline -->
      <div class="relative space-y-6">
        <div class="w-10 h-0.5 bg-white/40" />
        <h2 class="text-3xl font-semibold text-white leading-snug tracking-tight">
          เข้าสู่ระบบผู้ดูแล<br />Nakarin Studio
        </h2>
        <p class="text-sm text-white/60 leading-relaxed">
          สำหรับจัดการการจองและออเดอร์บายศรี
          ของนครินทร์ สตูดิโอ
        </p>
      </div>
      <!-- Bottom: notice -->
      <div class="relative border-t border-white/20 pt-5">
        <p class="text-xs text-white/40 tracking-wide uppercase">สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    </div>

    <!-- Right form panel -->
    <div class="flex-1 h-screen overflow-y-auto flex items-start lg:items-center justify-center p-6 sm:p-10 lg:p-14 bg-[radial-gradient(circle_at_top_right,#f0fdf4_0%,#ffffff_45%)]">
      <div class="w-full max-w-sm">
        <AdminAuthAuthBrand
          title="เข้าสู่ระบบ"
          subtitle="เข้าสู่ระบบด้วยเบอร์โทรศัพท์และรหัสผ่าน"
        />

        <form class="space-y-5 rounded-2xl border border-neutral-200/90 bg-white/95 backdrop-blur p-6 sm:p-7 shadow-[0_18px_50px_-24px_rgba(21,128,61,0.42)] transition-all duration-300" novalidate @submit.prevent="handleSubmit">
          <div
            v-if="infoMessage"
            class="rounded bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-3 text-sm text-[#166534]"
            role="status"
          >
            {{ infoMessage }}
          </div>

          <!-- General error -->
          <div
            v-if="errors.general"
            class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {{ errors.general }}
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="phone" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
              เบอร์โทรศัพท์ <span class="text-[#166534]">*</span>
            </label>
            <input
              id="phone"
              v-model="form.phone"
              name="phone"
              type="tel"
              inputmode="numeric"
              maxlength="12"
              placeholder="08x-xxx-xxxx"
              autocomplete="tel"
              class="w-full px-3.5 py-3 rounded-xl border text-sm bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition-all duration-200
                focus:ring-4 focus:ring-[#166534]/12 focus:border-[#166534]"
              :class="errors.phone ? 'border-red-400' : 'border-neutral-300 hover:border-neutral-400'"
              @input="handlePhoneInput"
            />
            <p v-if="errors.phone" class="text-xs text-red-500" role="alert">{{ errors.phone }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="password" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
                รหัสผ่าน <span class="text-[#166534]">*</span>
              </label>
              <NuxtLink
                to="/admin/auth/forgot-password"
                class="text-xs text-[#166534] hover:text-[#14532d] hover:underline transition-colors"
              >
                ลืมรหัสผ่าน?
              </NuxtLink>
            </div>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                placeholder="••••••••"
                autocomplete="current-password"
                class="w-full px-3.5 py-3 pr-10 rounded-xl border text-sm bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition-all duration-200
                  focus:ring-4 focus:ring-[#166534]/12 focus:border-[#166534]"
                :class="errors.password ? 'border-red-400' : 'border-neutral-300 hover:border-neutral-400'"
              />
              <button
                type="button"
                tabindex="-1"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <p v-if="errors.password" class="text-xs text-red-500" role="alert">{{ errors.password }}</p>
          </div>

          <!-- Remember me -->
          <label class="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              v-model="form.remember"
              type="checkbox"
              class="w-4 h-4 border border-neutral-400 accent-[#166534]"
            />
            <span class="text-sm text-neutral-600">จดจำการเข้าสู่ระบบ</span>
          </label>

          <button
            type="submit"
            :disabled="loading"
            class="mt-2 w-full rounded-xl bg-[#166534] py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(22,101,52,0.8)] transition-all duration-200 hover:bg-[#14532d] hover:shadow-[0_14px_28px_-14px_rgba(20,83,45,0.85)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span v-if="loading" class="inline-flex items-center gap-2">
              <span class="loading loading-spinner loading-xs" />
              กำลังเข้าสู่ระบบ...
            </span>
            <span v-else>เข้าสู่ระบบ</span>
          </button>
        </form>

        <p class="mt-6 text-center text-xs text-neutral-500">
          ยังไม่มีบัญชี?
          <NuxtLink to="/admin/auth/register" class="text-[#166534] hover:text-[#14532d] font-semibold hover:underline transition-colors ml-1">
            ลงทะเบียน
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
