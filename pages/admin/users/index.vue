<script setup lang="ts">
import BaseModal from '~/components/base/BaseModal.vue'
import type { MemberRow, MemberAccountRow, GenderOption, PrefixOption, MemberRole } from '~/composables/useAdminMemberApi'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'จัดการผู้ใช้งาน - Nakarin Studio Admin' })

const {
  listMembers, createMember, updateMember, deleteMember,
  listMemberAccounts, createMemberAccount, updateMemberAccount, deleteMemberAccount,
  listGenders, listPrefixes,
} = useAdminMemberApi()
const toast = useAppToast()

// ─── Data ─────────────────────────────────────────────────────────────────────

const members = ref<MemberRow[]>([])
const accounts = ref<MemberAccountRow[]>([])
const genders = ref<GenderOption[]>([])
const prefixes = ref<PrefixOption[]>([])
const loading = ref(true)
const searchQ = ref('')

const accountByMemberId = computed(() => {
  const m: Record<string, MemberAccountRow> = {}
  accounts.value.forEach(a => { m[a.memberId] = a })
  return m
})

const customers = computed(() => members.value.filter(m => m.role === 'customer'))

const filteredMembers = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  if (!q) return customers.value
  return customers.value.filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
    (accountByMemberId.value[m.id]?.phone ?? '').includes(q)
  )
})

const filteredPrefixes = computed(() =>
  memberForm.genderId
    ? prefixes.value.filter(p => p.genderId === memberForm.genderId)
    : prefixes.value
)

const load = async () => {
  loading.value = true
  try {
    const [m, a, g, p] = await Promise.all([listMembers(), listMemberAccounts(), listGenders(), listPrefixes()])
    members.value = m
    accounts.value = a
    genders.value = g
    prefixes.value = p
  } catch {
    toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้งานได้')
  } finally {
    loading.value = false
  }
}

// ─── Role config ─────────────────────────────────────────────────────────────

const roleConfig: Record<string, { label: string; cls: string }> = {
  admin:    { label: 'แอดมิน', cls: 'bg-purple-100 text-purple-700' },
  customer: { label: 'ลูกค้า',  cls: 'bg-blue-100 text-blue-700' },
}

const formatDate = (s: string | null) =>
  s ? new Date(s).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

// ─── Create / Edit member modal ───────────────────────────────────────────────

const memberModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const editingMember = ref<MemberRow | null>(null)
const savingMember = ref(false)
const memberForm = reactive({
  firstName: '',
  lastName: '',
  genderId: '',
  prefixId: '',
  role: 'customer' as MemberRole,
})

const openCreateMember = () => {
  editingMember.value = null
  Object.assign(memberForm, { firstName: '', lastName: '', genderId: '', prefixId: '', role: 'customer' })
  memberModalRef.value?.open()
}

const openEditMember = (m: MemberRow) => {
  editingMember.value = m
  Object.assign(memberForm, {
    firstName: m.firstName,
    lastName: m.lastName,
    genderId: m.genderId,
    prefixId: m.prefixId,
    role: m.role,
  })
  memberModalRef.value?.open()
}

const saveMember = async () => {
  if (!memberForm.firstName.trim() || !memberForm.lastName.trim()) {
    toast.warning('กรุณากรอกชื่อและนามสกุล')
    return
  }
  savingMember.value = true
  try {
    const payload = {
      genderId: memberForm.genderId,
      prefixId: memberForm.prefixId,
      firstName: memberForm.firstName,
      lastName: memberForm.lastName,
      role: memberForm.role,
    }
    if (editingMember.value) {
      const updated = await updateMember(editingMember.value.id, payload)
      const idx = members.value.findIndex(m => m.id === updated.id)
      if (idx !== -1) members.value[idx] = updated
      toast.success('แก้ไขผู้ใช้งานเรียบร้อย')
    } else {
      const created = await createMember(payload)
      members.value.unshift(created)
      toast.success('เพิ่มผู้ใช้งานเรียบร้อย')
    }
    memberModalRef.value?.close()
  } catch {
    toast.error('ไม่สามารถบันทึกข้อมูลผู้ใช้งานได้')
  } finally {
    savingMember.value = false
  }
}

// ─── Delete member ───────────────────────────────────────────────────────────

const deleteMemberModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const deletingMember = ref<MemberRow | null>(null)
const confirmingDelete = ref(false)

const openDeleteMember = (m: MemberRow) => {
  deletingMember.value = m
  deleteMemberModalRef.value?.open()
}

const confirmDeleteMember = async () => {
  if (!deletingMember.value) return
  confirmingDelete.value = true
  try {
    await deleteMember(deletingMember.value.id)
    members.value = members.value.filter(m => m.id !== deletingMember.value!.id)
    accounts.value = accounts.value.filter(a => a.memberId !== deletingMember.value!.id)
    toast.success('ลบผู้ใช้งานเรียบร้อย')
    deleteMemberModalRef.value?.close()
  } catch {
    toast.error('ไม่สามารถลบผู้ใช้งานได้')
  } finally {
    confirmingDelete.value = false
  }
}

// ─── Account modal (phone + password) ───────────────────────────────────────

const accountModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const accountTargetMember = ref<MemberRow | null>(null)
const savingAccount = ref(false)
const accountForm = reactive({ phone: '', password: '' })

const openAccountModal = (m: MemberRow) => {
  accountTargetMember.value = m
  const existing = accountByMemberId.value[m.id]
  Object.assign(accountForm, { phone: existing?.phone ?? '', password: '' })
  accountModalRef.value?.open()
}

const saveAccount = async () => {
  if (!accountTargetMember.value) return
  if (!accountForm.phone.trim()) { toast.warning('กรุณากรอกเบอร์โทรศัพท์'); return }
  savingAccount.value = true
  try {
    const existing = accountByMemberId.value[accountTargetMember.value.id]
    if (existing) {
      const updated = await updateMemberAccount(existing.id, {
        memberId: accountTargetMember.value.id,
        phone: accountForm.phone,
        password: accountForm.password || existing.phone, // keep old if blank
      })
      const idx = accounts.value.findIndex(a => a.id === existing.id)
      if (idx !== -1) accounts.value[idx] = updated
      toast.success('อัปเดตบัญชีเรียบร้อย')
    } else {
      if (!accountForm.password.trim()) { toast.warning('กรุณากรอกรหัสผ่าน'); savingAccount.value = false; return }
      const created = await createMemberAccount({
        memberId: accountTargetMember.value.id,
        phone: accountForm.phone,
        password: accountForm.password,
      })
      accounts.value.push(created)
      toast.success('สร้างบัญชีเรียบร้อย')
    }
    accountModalRef.value?.close()
  } catch {
    toast.error('ไม่สามารถบันทึกบัญชีได้')
  } finally {
    savingAccount.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.17),transparent_34%),linear-gradient(132deg,#0f172a_0%,#1f3f6b_46%,#10233f_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-sky-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-blue-200/10 blur-2xl" />
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">User Directory</p>
          <h1 class="mt-2 text-2xl font-bold text-white leading-tight md:text-[30px]">จัดการผู้ใช้งาน</h1>
          <p class="mt-2 text-sm text-slate-200/90">ดูแลบัญชีลูกค้า ข้อมูลสมาชิก และสิทธิ์การเข้าถึง</p>
        </div>
        <span class="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          ลูกค้าทั้งหมด {{ customers.length }} คน
        </span>
      </div>
    </div>

    <div class="flex items-center justify-end">
      <button
        class="ns-admin-btn ns-admin-btn-primary"
        @click="openCreateMember"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        เพิ่มผู้ใช้งาน
      </button>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,.45)] backdrop-blur-sm md:p-5">
      <div class="relative max-w-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
        </svg>
        <input
          v-model="searchQ"
          type="text"
          placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
          class="ns-admin-input h-10 pl-9 pr-3"
        />
      </div>
    </div>

    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 px-4 py-3">
        <p class="text-sm font-semibold text-slate-800">รายการผู้ใช้งาน</p>
        <p class="text-xs text-slate-500">ทั้งหมด {{ filteredMembers.length }} รายการ</p>
      </div>
      <div v-if="loading" class="flex items-center justify-center py-20">
        <span class="loading loading-spinner loading-md text-[#16a34a]" />
      </div>
      <div v-else-if="filteredMembers.length === 0" class="flex flex-col items-center justify-center py-20 gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 text-neutral-200">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
        <p class="text-sm text-slate-400">ไม่พบผู้ใช้งาน</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50/90">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ชื่อ - นามสกุล</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">บทบาท</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">เบอร์โทร</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ล็อกอินล่าสุด</th>
              <th class="w-28 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="m in filteredMembers" :key="m.id" class="transition-colors hover:bg-slate-50/70">
              <td class="px-4 py-3">
                <p class="font-medium text-slate-900">{{ m.firstName }} {{ m.lastName }}</p>
                <p class="font-mono text-xs text-slate-400">{{ m.id.slice(0, 8) }}…</p>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="roleConfig[m.role]?.cls ?? 'bg-neutral-100 text-neutral-600'"
                >
                  {{ roleConfig[m.role]?.label ?? m.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span v-if="accountByMemberId[m.id]" class="font-mono text-neutral-800">
                  {{ accountByMemberId[m.id].phone }}
                </span>
                <span v-else class="text-xs text-slate-400">ยังไม่มีบัญชี</span>
              </td>
              <td class="px-4 py-3 text-xs text-slate-500">{{ formatDate(m.lastLogin) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1">
                  <!-- Account -->
                  <button
                    class="ns-admin-icon-btn h-7 w-7"
                    :title="accountByMemberId[m.id] ? 'จัดการบัญชี' : 'สร้างบัญชี'"
                    @click="openAccountModal(m)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <!-- Edit -->
                  <button
                    class="ns-admin-icon-btn h-7 w-7"
                    title="แก้ไข"
                    @click="openEditMember(m)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <!-- Delete -->
                  <button
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                    title="ลบ"
                    @click="openDeleteMember(m)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
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

    <!-- ─── Create / Edit Member Modal ────────────────────────────────────── -->
    <BaseModal
      ref="memberModalRef"
      id="member-modal"
      :title="editingMember ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'"
      :backdrop-close="false"
    >
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label class="block text-xs text-neutral-500 mb-1">ชื่อ *</label>
          <input
            v-model="memberForm.firstName"
            type="text"
            class="ns-admin-input"
            placeholder="ชื่อ"
          />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">นามสกุล *</label>
          <input
            v-model="memberForm.lastName"
            type="text"
            class="ns-admin-input"
            placeholder="นามสกุล"
          />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">เพศ</label>
          <BaseSelectDropdown
            v-model="memberForm.genderId"
            :options="[{ label: '-- เลือกเพศ --', value: '' }, ...genders.map(g => ({ label: g.name, value: g.id }))]"
            placeholder="-- เลือกเพศ --"
            class="dropdown-top"
            @update:model-value="memberForm.prefixId = ''"
          />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">คำนำหน้า</label>
          <BaseSelectDropdown
            v-model="memberForm.prefixId"
            :options="[{ label: '-- เลือกคำนำหน้า --', value: '' }, ...filteredPrefixes.map(p => ({ label: p.name, value: p.id }))]"
            placeholder="-- เลือกคำนำหน้า --"
            class="dropdown-top"
            :disabled="!memberForm.genderId"
          />
        </div>
        <div class="col-span-2">
          <label class="block text-xs text-neutral-500 mb-1">บทบาท</label>
          <BaseSelectDropdown
            v-model="memberForm.role"
            :options="[{ label: 'ลูกค้า', value: 'customer' }, { label: 'แอดมิน', value: 'admin' }]"
            class="dropdown-top"
          />
        </div>
      </div>
      <template #actions>
        <div class="flex justify-end gap-2">
          <button
            class="ns-admin-btn ns-admin-btn-secondary"
            @click="memberModalRef?.close()"
          >
            ยกเลิก
          </button>
          <button
            class="ns-admin-btn ns-admin-btn-primary disabled:opacity-60"
            :disabled="savingMember"
            @click="saveMember"
          >
            <span v-if="savingMember" class="loading loading-spinner loading-xs" />
            {{ editingMember ? 'บันทึก' : 'เพิ่มผู้ใช้งาน' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- ─── Delete Confirm Modal ───────────────────────────────────────────── -->
    <BaseModal ref="deleteMemberModalRef" id="delete-member-modal" title="ลบผู้ใช้งาน">
      <p class="text-sm text-neutral-700">
        ต้องการลบผู้ใช้งาน
        <span class="font-semibold text-neutral-900">{{ deletingMember?.firstName }} {{ deletingMember?.lastName }}</span>
        ออกจากระบบ?
        <br /><span class="text-red-600 text-xs mt-1 block">ข้อมูลบัญชีและกิจกรรมทั้งหมดจะหายถาวร</span>
      </p>
      <template #actions>
        <div class="flex justify-end gap-2">
          <button
            class="ns-admin-btn ns-admin-btn-secondary"
            @click="deleteMemberModalRef?.close()"
          >
            ยกเลิก
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
            :disabled="confirmingDelete"
            @click="confirmDeleteMember"
          >
            <span v-if="confirmingDelete" class="loading loading-spinner loading-xs" />
            ลบผู้ใช้งาน
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- ─── Account Modal ─────────────────────────────────────────────────── -->
    <BaseModal
      ref="accountModalRef"
      id="account-modal"
      :title="accountByMemberId[accountTargetMember?.id ?? ''] ? 'จัดการบัญชี' : 'สร้างบัญชีผู้ใช้'"
      :backdrop-close="false"
    >
      <p class="text-xs text-neutral-500 mb-4">
        ผู้ใช้งาน: <span class="font-semibold text-neutral-800">{{ accountTargetMember?.firstName }} {{ accountTargetMember?.lastName }}</span>
      </p>
      <div class="space-y-3 text-sm">
        <div>
          <label class="block text-xs text-neutral-500 mb-1">เบอร์โทรศัพท์ *</label>
          <input
            v-model="accountForm.phone"
            type="tel"
            class="ns-admin-input"
            placeholder="0812345678"
          />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">
            รหัสผ่าน
            <span v-if="accountByMemberId[accountTargetMember?.id ?? '']" class="text-neutral-400">(เว้นว่างเพื่อคงเดิม)</span>
            <span v-else class="text-red-500"> *</span>
          </label>
          <input
            v-model="accountForm.password"
            type="password"
            class="ns-admin-input"
            placeholder="••••••••"
          />
        </div>
      </div>
      <template #actions>
        <div class="flex justify-end gap-2">
          <button
            class="ns-admin-btn ns-admin-btn-secondary"
            @click="accountModalRef?.close()"
          >
            ยกเลิก
          </button>
          <button
            class="ns-admin-btn ns-admin-btn-primary disabled:opacity-60"
            :disabled="savingAccount"
            @click="saveAccount"
          >
            <span v-if="savingAccount" class="loading loading-spinner loading-xs" />
            บันทึก
          </button>
        </div>
      </template>
    </BaseModal>
  </section>
</template>
