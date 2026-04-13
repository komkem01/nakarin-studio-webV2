<script setup lang="ts">
import BaseModal from '~/components/base/BaseModal.vue'
import type { MemberRow, MemberAccountRow, GenderOption, PrefixOption } from '~/composables/useAdminMemberApi'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'โปรไฟล์ - Nakarin Studio Admin' })

const {
  updateMember,
  listMemberAccounts, updateMemberAccount,
  listGenders, listPrefixes,
} = useAdminMemberApi()
const { authFetch } = useAdminSession()
const toast = useAppToast()

// ─── Session ──────────────────────────────────────────────────────────────────

type SessionMember = { id: string; firstName: string; lastName: string; role: string }
type StoredSession = { member?: SessionMember }

const getStoredSession = (): StoredSession => {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem('ns_admin_auth') || sessionStorage.getItem('ns_admin_auth')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const sessionMemberId = computed(() => getStoredSession().member?.id ?? '')

// ─── Data ─────────────────────────────────────────────────────────────────────

type ApiEnv<T> = { data?: T }
type MemberDetail = {
  id?: string; first_name?: string; last_name?: string
  gender_id?: string; prefix_id?: string; role?: string; last_login?: string | null
}

const member = ref<MemberRow | null>(null)
const account = ref<MemberAccountRow | null>(null)
const genders = ref<GenderOption[]>([])
const prefixes = ref<PrefixOption[]>([])
const loading = ref(true)

const formatDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

const load = async () => {
  const memberId = sessionMemberId.value
  if (!memberId) { loading.value = false; return }
  loading.value = true
  try {
    const [mRes, accs, gs, ps] = await Promise.all([
      authFetch<ApiEnv<MemberDetail>>(`/api/v1/members/${memberId}`),
      listMemberAccounts(),
      listGenders(),
      listPrefixes(),
    ])
    const d = mRes?.data ?? {}
    member.value = {
      id: d.id ?? memberId,
      firstName: d.first_name ?? '',
      lastName: d.last_name ?? '',
      genderId: d.gender_id ?? '',
      prefixId: d.prefix_id ?? '',
      role: (d.role ?? 'admin') as 'admin' | 'customer',
      lastLogin: d.last_login ?? null,
    }
    account.value = accs.find(a => a.memberId === memberId) ?? null
    genders.value = gs
    prefixes.value = ps
  } catch {
    toast.error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้')
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ─── Edit profile modal ───────────────────────────────────────────────────────

const editModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const saving = ref(false)
const editForm = reactive({ firstName: '', lastName: '', genderId: '', prefixId: '' })

const filteredPrefixes = computed(() =>
  editForm.genderId ? prefixes.value.filter(p => p.genderId === editForm.genderId) : prefixes.value
)

const genderName = computed(() => genders.value.find(g => g.id === member.value?.genderId)?.name ?? '-')
const prefixName = computed(() => prefixes.value.find(p => p.id === member.value?.prefixId)?.name ?? '-')

const openEdit = () => {
  if (!member.value) return
  Object.assign(editForm, {
    firstName: member.value.firstName,
    lastName: member.value.lastName,
    genderId: member.value.genderId,
    prefixId: member.value.prefixId,
  })
  editModalRef.value?.open()
}

const submitEdit = async () => {
  if (!member.value) return
  if (!editForm.firstName.trim() || !editForm.lastName.trim()) { toast.warning('กรุณากรอกชื่อและนามสกุล'); return }
  saving.value = true
  try {
    const updated = await updateMember(member.value.id, {
      genderId: editForm.genderId,
      prefixId: editForm.prefixId,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      role: member.value.role,
    })
    member.value = updated
    toast.success('แก้ไขข้อมูลเรียบร้อย')
    editModalRef.value?.close()
  } catch {
    toast.error('ไม่สามารถบันทึกข้อมูลได้')
  } finally {
    saving.value = false
  }
}

// ─── Change password modal ────────────────────────────────────────────────────

const pwModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const changingPw = ref(false)
const pwForm = reactive({ phone: '', currentPassword: '', newPassword: '', confirmPassword: '' })

const openChangePw = () => {
  Object.assign(pwForm, { phone: account.value?.phone ?? '', currentPassword: '', newPassword: '', confirmPassword: '' })
  pwModalRef.value?.open()
}

const submitChangePw = async () => {
  if (!account.value || !member.value) return
  if (!pwForm.newPassword.trim()) { toast.warning('กรุณากรอกรหัสผ่านใหม่'); return }
  if (pwForm.newPassword !== pwForm.confirmPassword) { toast.warning('รหัสผ่านใหม่และยืนยันไม่ตรงกัน'); return }
  if (pwForm.newPassword.length < 6) { toast.warning('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
  changingPw.value = true
  try {
    await updateMemberAccount(account.value.id, {
      memberId: member.value.id,
      phone: account.value.phone,
      password: pwForm.newPassword,
    })
    toast.success('เปลี่ยนรหัสผ่านเรียบร้อย')
    pwModalRef.value?.close()
  } catch {
    toast.error('ไม่สามารถเปลี่ยนรหัสผ่านได้')
  } finally {
    changingPw.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div>
      <h1 class="text-lg font-bold text-neutral-900">โปรไฟล์ของฉัน</h1>
      <p class="text-sm text-neutral-500 mt-0.5">ข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <span class="loading loading-spinner loading-md text-[#16a34a]" />
    </div>

    <template v-else-if="member">
      <!-- Profile card -->
      <div class="bg-white rounded-2xl border border-neutral-200 p-6">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-2xl shrink-0">
            {{ member.firstName.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold text-neutral-900">{{ member.firstName }} {{ member.lastName }}</h2>
            <div class="flex items-center gap-2 mt-1">
              <span class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">แอดมิน</span>
              <span v-if="account" class="text-sm text-neutral-500 font-mono">{{ account.phone }}</span>
            </div>
          </div>
          <button
            class="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-[#bbf7d0] hover:bg-[#f0fdf4] hover:text-[#166534] transition-colors"
            @click="openEdit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
            </svg>
            แก้ไข
          </button>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p class="text-xs text-neutral-500">ชื่อ</p>
            <p class="mt-0.5 font-medium text-neutral-900">{{ member.firstName }}</p>
          </div>
          <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p class="text-xs text-neutral-500">นามสกุล</p>
            <p class="mt-0.5 font-medium text-neutral-900">{{ member.lastName }}</p>
          </div>
          <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p class="text-xs text-neutral-500">เพศ</p>
            <p class="mt-0.5 font-medium text-neutral-900">{{ genderName }}</p>
          </div>
          <div class="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p class="text-xs text-neutral-500">คำนำหน้า</p>
            <p class="mt-0.5 font-medium text-neutral-900">{{ prefixName }}</p>
          </div>
          <div class="col-span-2 rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p class="text-xs text-neutral-500">ล็อกอินล่าสุด</p>
            <p class="mt-0.5 font-medium text-neutral-900">{{ formatDate(member.lastLogin) }}</p>
          </div>
        </div>
      </div>

      <!-- Account security card -->
      <div class="bg-white rounded-2xl border border-neutral-200 p-6">
        <h3 class="text-base font-semibold text-neutral-900">ความปลอดภัยบัญชี</h3>
        <div class="mt-4 space-y-3">
          <div class="flex items-center justify-between rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <div>
              <p class="text-sm font-medium text-neutral-800">เบอร์โทรศัพท์</p>
              <p class="text-sm text-neutral-500 font-mono mt-0.5">{{ account?.phone ?? '-' }}</p>
            </div>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <div>
              <p class="text-sm font-medium text-neutral-800">รหัสผ่าน</p>
              <p class="text-sm text-neutral-400 mt-0.5">••••••••</p>
            </div>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-900 transition-colors"
              @click="openChangePw"
            >
              เปลี่ยนรหัสผ่าน
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
      <p class="text-sm text-neutral-400">ไม่พบข้อมูลโปรไฟล์</p>
    </div>

    <!-- ─── Edit Profile Modal ─────────────────────────────────────────── -->
    <BaseModal ref="editModalRef" id="edit-profile-modal" title="แก้ไขข้อมูลส่วนตัว" :backdrop-close="false">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label class="block text-xs text-neutral-500 mb-1">ชื่อ *</label>
          <input v-model="editForm.firstName" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">นามสกุล *</label>
          <input v-model="editForm.lastName" type="text" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">เพศ</label>
          <BaseSelectDropdown
            v-model="editForm.genderId"
            :options="[{ label: '-- เลือกเพศ --', value: '' }, ...genders.map(g => ({ label: g.name, value: g.id }))]"
            @update:model-value="editForm.prefixId = ''"
          />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">คำนำหน้า</label>
          <BaseSelectDropdown
            v-model="editForm.prefixId"
            :options="[{ label: '-- เลือกคำนำหน้า --', value: '' }, ...filteredPrefixes.map(p => ({ label: p.name, value: p.id }))]"
            :disabled="!editForm.genderId"
          />
        </div>
      </div>
      <template #actions>
        <div class="flex justify-end gap-2">
          <button class="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors" @click="editModalRef?.close()">ยกเลิก</button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-[#15803d] px-4 py-2 text-sm font-medium text-white hover:bg-[#166534] transition-colors disabled:opacity-60"
            :disabled="saving"
            @click="submitEdit"
          >
            <span v-if="saving" class="loading loading-spinner loading-xs" />
            บันทึก
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- ─── Change Password Modal ──────────────────────────────────────── -->
    <BaseModal ref="pwModalRef" id="change-pw-modal" title="เปลี่ยนรหัสผ่าน" :backdrop-close="false">
      <div class="space-y-3 text-sm">
        <div>
          <label class="block text-xs text-neutral-500 mb-1">รหัสผ่านใหม่ *</label>
          <input v-model="pwForm.newPassword" type="password" placeholder="อย่างน้อย 6 ตัวอักษร" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">ยืนยันรหัสผ่านใหม่ *</label>
          <input v-model="pwForm.confirmPassword" type="password" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" class="w-full h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30" />
        </div>
      </div>
      <template #actions>
        <div class="flex justify-end gap-2">
          <button class="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors" @click="pwModalRef?.close()">ยกเลิก</button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 transition-colors disabled:opacity-60"
            :disabled="changingPw"
            @click="submitChangePw"
          >
            <span v-if="changingPw" class="loading loading-spinner loading-xs" />
            เปลี่ยนรหัสผ่าน
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
