<script setup lang="ts">
import BaseModal from '~/components/base/BaseModal.vue'
import type { MemberRow, MemberAccountRow, GenderOption, PrefixOption } from '~/composables/useAdminMemberApi'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'จัดการแอดมิน - Nakarin Studio Admin' })

const {
  listMembers, updateMember, deleteMember,
  listMemberAccounts,
  listGenders, listPrefixes,
  registerAdmin,
} = useAdminMemberApi()
const toast = useAppToast()

// ─── Data ─────────────────────────────────────────────────────────────────────

const members = ref<MemberRow[]>([])
const accounts = ref<MemberAccountRow[]>([])
const genders = ref<GenderOption[]>([])
const prefixes = ref<PrefixOption[]>([])
const loading = ref(true)
const searchQ = ref('')

const admins = computed(() =>
  members.value.filter(m => m.role === 'admin')
)

const filteredAdmins = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  if (!q) return admins.value
  return admins.value.filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
    (accountByMemberId.value[m.id]?.phone ?? '').includes(q)
  )
})

const accountByMemberId = computed(() => {
  const map: Record<string, MemberAccountRow> = {}
  accounts.value.forEach(a => { map[a.memberId] = a })
  return map
})

const filteredPrefixes = computed(() =>
  editForm.genderId
    ? prefixes.value.filter(p => p.genderId === editForm.genderId)
    : prefixes.value
)

const filteredPrefixesCreate = computed(() =>
  createForm.genderId
    ? prefixes.value.filter(p => p.genderId === createForm.genderId)
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
    toast.error('ไม่สามารถโหลดข้อมูลแอดมินได้')
  } finally {
    loading.value = false
  }
}

const formatDate = (s: string | null) =>
  s ? new Date(s).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

// ─── Create admin modal ───────────────────────────────────────────────────────

const createModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const creating = ref(false)
const createForm = reactive({
  firstName: '', lastName: '', genderId: '', prefixId: '', phone: '', password: '',
})

const openCreate = () => {
  Object.assign(createForm, { firstName: '', lastName: '', genderId: '', prefixId: '', phone: '', password: '' })
  createModalRef.value?.open()
}

const submitCreate = async () => {
  if (!createForm.firstName.trim() || !createForm.lastName.trim()) { toast.warning('กรุณากรอกชื่อและนามสกุล'); return }
  if (!createForm.phone.trim()) { toast.warning('กรุณากรอกเบอร์โทรศัพท์'); return }
  if (!createForm.password.trim()) { toast.warning('กรุณากรอกรหัสผ่าน'); return }
  creating.value = true
  try {
    await registerAdmin({
      genderId: createForm.genderId,
      prefixId: createForm.prefixId,
      firstName: createForm.firstName,
      lastName: createForm.lastName,
      phone: createForm.phone,
      password: createForm.password,
    })
    toast.success('เพิ่มแอดมินเรียบร้อย')
    createModalRef.value?.close()
    await load()
  } catch {
    toast.error('ไม่สามารถเพิ่มแอดมินได้ (เบอร์โทรอาจถูกใช้งานแล้ว)')
  } finally {
    creating.value = false
  }
}

// ─── Edit admin modal ─────────────────────────────────────────────────────────

const editModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const editingAdmin = ref<MemberRow | null>(null)
const saving = ref(false)
const editForm = reactive({ firstName: '', lastName: '', genderId: '', prefixId: '' })

const openEdit = (m: MemberRow) => {
  editingAdmin.value = m
  Object.assign(editForm, { firstName: m.firstName, lastName: m.lastName, genderId: m.genderId, prefixId: m.prefixId })
  editModalRef.value?.open()
}

const submitEdit = async () => {
  if (!editingAdmin.value) return
  if (!editForm.firstName.trim() || !editForm.lastName.trim()) { toast.warning('กรุณากรอกชื่อและนามสกุล'); return }
  saving.value = true
  try {
    const updated = await updateMember(editingAdmin.value.id, {
      genderId: editForm.genderId,
      prefixId: editForm.prefixId,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      role: 'admin',
    })
    const idx = members.value.findIndex(m => m.id === updated.id)
    if (idx !== -1) members.value[idx] = updated
    toast.success('แก้ไขข้อมูลแอดมินเรียบร้อย')
    editModalRef.value?.close()
  } catch {
    toast.error('ไม่สามารถแก้ไขข้อมูลได้')
  } finally {
    saving.value = false
  }
}

// ─── Delete admin modal ───────────────────────────────────────────────────────

const deleteModalRef = ref<InstanceType<typeof BaseModal> | null>(null)
const deletingAdmin = ref<MemberRow | null>(null)
const confirmingDelete = ref(false)

const openDelete = (m: MemberRow) => { deletingAdmin.value = m; deleteModalRef.value?.open() }

const confirmDelete = async () => {
  if (!deletingAdmin.value) return
  confirmingDelete.value = true
  try {
    await deleteMember(deletingAdmin.value.id)
    members.value = members.value.filter(m => m.id !== deletingAdmin.value!.id)
    accounts.value = accounts.value.filter(a => a.memberId !== deletingAdmin.value!.id)
    toast.success('ลบแอดมินเรียบร้อย')
    deleteModalRef.value?.close()
  } catch {
    toast.error('ไม่สามารถลบแอดมินได้')
  } finally {
    confirmingDelete.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.17),transparent_34%),linear-gradient(132deg,#0f172a_0%,#4c1d95_46%,#2e1065_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-purple-200/10 blur-2xl" />
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">Admin Directory</p>
          <h1 class="mt-2 text-2xl font-bold text-white leading-tight md:text-[30px]">จัดการแอดมิน</h1>
          <p class="mt-2 text-sm text-slate-200/90">บริหารสิทธิ์ผู้ดูแลระบบและข้อมูลบัญชีแอดมิน</p>
        </div>
        <span class="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          แอดมินทั้งหมด {{ admins.length }} คน
        </span>
      </div>
    </div>

    <div class="flex items-center justify-end">
      <button
        class="ns-admin-btn ns-admin-btn-primary"
        @click="openCreate"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        เพิ่มแอดมิน
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
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-violet-50/40 px-4 py-3">
        <p class="text-sm font-semibold text-slate-800">รายการแอดมิน</p>
        <p class="text-xs text-slate-500">ทั้งหมด {{ filteredAdmins.length }} รายการ</p>
      </div>
      <div v-if="loading" class="flex items-center justify-center py-20">
        <span class="loading loading-spinner loading-md text-[#16a34a]" />
      </div>
      <div v-else-if="filteredAdmins.length === 0" class="flex flex-col items-center justify-center py-20 gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 text-neutral-200">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        <p class="text-sm text-slate-400">ไม่พบแอดมิน</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50/90">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ชื่อ-นามสกุล</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">เบอร์โทร</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ล็อกอินล่าสุด</th>
              <th class="w-20 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="m in filteredAdmins" :key="m.id" class="transition-colors hover:bg-slate-50/70">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                    {{ m.firstName.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-slate-900">{{ m.firstName }} {{ m.lastName }}</p>
                    <p class="font-mono text-xs text-slate-400">{{ m.id.slice(0, 8) }}…</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span v-if="accountByMemberId[m.id]" class="font-mono text-neutral-800">
                  {{ accountByMemberId[m.id].phone }}
                </span>
                <span v-else class="text-xs text-slate-400">-</span>
              </td>
              <td class="px-4 py-3 text-xs text-slate-500">{{ formatDate(m.lastLogin) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1">
                  <button
                    class="ns-admin-icon-btn h-7 w-7"
                    title="แก้ไข"
                    @click="openEdit(m)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                    title="ลบ"
                    @click="openDelete(m)"
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

    <!-- ─── Create Admin Modal ────────────────────────────────────────────── -->
    <BaseModal ref="createModalRef" id="create-admin-modal" title="เพิ่มแอดมิน" :backdrop-close="false">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label class="block text-xs text-neutral-500 mb-1">ชื่อ *</label>
          <input v-model="createForm.firstName" type="text" placeholder="ชื่อ" class="ns-admin-input" />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">นามสกุล *</label>
          <input v-model="createForm.lastName" type="text" placeholder="นามสกุล" class="ns-admin-input" />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">เพศ</label>
          <BaseSelectDropdown
            v-model="createForm.genderId"
            :options="[{ label: '-- เลือกเพศ --', value: '' }, ...genders.map(g => ({ label: g.name, value: g.id }))]"
            @update:model-value="createForm.prefixId = ''"
          />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">คำนำหน้า</label>
          <BaseSelectDropdown
            v-model="createForm.prefixId"
            :options="[{ label: '-- เลือกคำนำหน้า --', value: '' }, ...filteredPrefixesCreate.map(p => ({ label: p.name, value: p.id }))]"
            :disabled="!createForm.genderId"
          />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">เบอร์โทรศัพท์ *</label>
          <input v-model="createForm.phone" type="tel" placeholder="0812345678" class="ns-admin-input" />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">รหัสผ่าน *</label>
          <input v-model="createForm.password" type="password" placeholder="••••••••" class="ns-admin-input" />
        </div>
      </div>
      <template #actions>
        <div class="flex justify-end gap-2">
          <button class="ns-admin-btn ns-admin-btn-secondary" @click="createModalRef?.close()">ยกเลิก</button>
          <button
            class="ns-admin-btn ns-admin-btn-primary disabled:opacity-60"
            :disabled="creating"
            @click="submitCreate"
          >
            <span v-if="creating" class="loading loading-spinner loading-xs" />
            เพิ่มแอดมิน
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- ─── Edit Admin Modal ───────────────────────────────────────────────── -->
    <BaseModal ref="editModalRef" id="edit-admin-modal" title="แก้ไขข้อมูลแอดมิน" :backdrop-close="false">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label class="block text-xs text-neutral-500 mb-1">ชื่อ *</label>
          <input v-model="editForm.firstName" type="text" class="ns-admin-input" />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">นามสกุล *</label>
          <input v-model="editForm.lastName" type="text" class="ns-admin-input" />
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
          <button class="ns-admin-btn ns-admin-btn-secondary" @click="editModalRef?.close()">ยกเลิก</button>
          <button
            class="ns-admin-btn ns-admin-btn-primary disabled:opacity-60"
            :disabled="saving"
            @click="submitEdit"
          >
            <span v-if="saving" class="loading loading-spinner loading-xs" />
            บันทึก
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- ─── Delete Confirm Modal ───────────────────────────────────────────── -->
    <BaseModal ref="deleteModalRef" id="delete-admin-modal" title="ลบแอดมิน">
      <p class="text-sm text-neutral-700">
        ต้องการลบแอดมิน
        <span class="font-semibold text-neutral-900">{{ deletingAdmin?.firstName }} {{ deletingAdmin?.lastName }}</span>
        ออกจากระบบ?
        <span class="text-red-600 text-xs mt-1 block">บัญชีและสิทธิ์การเข้าถึงจะถูกลบถาวร</span>
      </p>
      <template #actions>
        <div class="flex justify-end gap-2">
          <button class="ns-admin-btn ns-admin-btn-secondary" @click="deleteModalRef?.close()">ยกเลิก</button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
            :disabled="confirmingDelete"
            @click="confirmDelete"
          >
            <span v-if="confirmingDelete" class="loading loading-spinner loading-xs" />
            ลบแอดมิน
          </button>
        </div>
      </template>
    </BaseModal>
  </section>
</template>
