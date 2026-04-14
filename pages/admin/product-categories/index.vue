<script setup lang="ts">
import { useAppToast } from '~/composables/useAppToast'
import BaseModalComponent from '~/components/base/BaseModal.vue'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'จัดการหมวดหมู่สินค้า - Nakarin Studio Admin' })

const { listCategories, createCategory, updateCategory, deleteCategory } = useAdminCatalogApi()
const toast = useAppToast()

const loading = ref(true)
const saving = ref(false)
const savingEdit = ref(false)
const deleting = ref(false)

const categories = ref<Array<{
  id: string
  parentId?: string | null
  name: string
  slug: string
  description?: string | null
  sortOrder: number
  isActive: boolean
}>>([])

const query = ref('')
const statusFilter = ref('')

const createModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const editModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const deleteModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const slugTouched = ref(false)
const editSlugTouched = ref(false)
const editingCategoryId = ref('')
const deletingCategoryId = ref('')

const form = reactive({
  parentId: '',
  name: '',
  slug: '',
  description: '',
  sortOrder: 0,
  isActive: true,
})

const editForm = reactive({
  parentId: '',
  name: '',
  slug: '',
  description: '',
  sortOrder: 0,
  isActive: true,
})

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

watch(() => form.name, (next) => {
  if (!slugTouched.value) form.slug = toSlug(next)
})

watch(() => editForm.name, (next) => {
  if (!editSlugTouched.value) editForm.slug = toSlug(next)
})

const fetchCategories = async () => {
  loading.value = true
  try {
    categories.value = await listCategories()
  } catch {
    toast.error('ไม่สามารถโหลดข้อมูลหมวดหมู่ได้')
  } finally {
    loading.value = false
  }
}

const categoryMap = computed(() => {
  return Object.fromEntries(categories.value.map(item => [item.id, item.name]))
})

const filteredCategories = computed(() => {
  const q = query.value.trim().toLowerCase()
  return categories.value.filter(item => {
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    const matchesStatus = !statusFilter.value || String(item.isActive) === statusFilter.value
    return matchesQuery && matchesStatus
  })
})

const deletingCategoryName = computed(() => categories.value.find(item => item.id === deletingCategoryId.value)?.name || '')
const statusOptions = [
  { label: 'ทุกสถานะ', value: '' },
  { label: 'ใช้งาน', value: 'true' },
  { label: 'ปิดใช้งาน', value: 'false' },
]
const nextSortOrder = computed(() => {
  if (!categories.value.length) return 1
  const maxSort = Math.max(...categories.value.map(item => Number(item.sortOrder || 0)))
  return maxSort + 1
})
const parentCategoryOptions = computed(() => [
  { label: 'ไม่มีหมวดหลัก', value: '' },
  ...categories.value.map(item => ({ label: item.name, value: item.id })),
])
const editParentCategoryOptions = computed(() => [
  { label: 'ไม่มีหมวดหลัก', value: '' },
  ...categories.value
    .filter(cat => cat.id !== editingCategoryId.value)
    .map(item => ({ label: item.name, value: item.id })),
])

const openCreateModal = () => {
  slugTouched.value = false
  form.sortOrder = nextSortOrder.value
  createModalRef.value?.open()
}

const resetForm = () => {
  form.parentId = ''
  form.name = ''
  form.slug = ''
  form.description = ''
  form.sortOrder = nextSortOrder.value
  form.isActive = true
}

const submitCreate = async () => {
  if (!form.name.trim() || !form.slug.trim()) {
    toast.warning('กรุณากรอกชื่อหมวดหมู่และ slug')
    return
  }

  saving.value = true
  try {
    await createCategory({
      parentId: form.parentId || null,
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive,
    })
    toast.success('เพิ่มหมวดหมู่เรียบร้อย')
    createModalRef.value?.close()
    resetForm()
    await fetchCategories()
  } catch {
    toast.error('ไม่สามารถเพิ่มหมวดหมู่ได้')
  } finally {
    saving.value = false
  }
}

const openEditModal = (item: {
  id: string
  parentId?: string | null
  name: string
  slug: string
  description?: string | null
  sortOrder: number
  isActive: boolean
}) => {
  editingCategoryId.value = item.id
  editForm.parentId = item.parentId || ''
  editForm.name = item.name
  editForm.slug = item.slug
  editForm.description = item.description || ''
  editForm.sortOrder = item.sortOrder
  editForm.isActive = item.isActive
  editSlugTouched.value = false
  editModalRef.value?.open()
}

const submitEdit = async () => {
  if (!editingCategoryId.value) return
  if (!editForm.name.trim() || !editForm.slug.trim()) {
    toast.warning('กรุณากรอกชื่อหมวดหมู่และ slug')
    return
  }

  const index = categories.value.findIndex(item => item.id === editingCategoryId.value)
  if (index < 0) return

  const previous = { ...categories.value[index] }
  const optimistic = {
    ...categories.value[index],
    parentId: editForm.parentId || null,
    name: editForm.name.trim(),
    slug: editForm.slug.trim(),
    description: editForm.description.trim(),
    sortOrder: Number(editForm.sortOrder || 0),
    isActive: editForm.isActive,
  }

  categories.value[index] = optimistic
  savingEdit.value = true
  try {
    const updated = await updateCategory(editingCategoryId.value, {
      parentId: optimistic.parentId,
      name: optimistic.name,
      slug: optimistic.slug,
      description: optimistic.description || '',
      sortOrder: optimistic.sortOrder,
      isActive: optimistic.isActive,
    })
    categories.value[index] = updated
    toast.success('บันทึกการแก้ไขหมวดหมู่เรียบร้อย')
    editModalRef.value?.close()
  } catch {
    categories.value[index] = previous
    toast.error('ไม่สามารถแก้ไขหมวดหมู่ได้')
  } finally {
    savingEdit.value = false
  }
}

const requestDelete = (id: string) => {
  deletingCategoryId.value = id
  deleteModalRef.value?.open()
}

const submitDelete = async () => {
  if (!deletingCategoryId.value) return
  const index = categories.value.findIndex(item => item.id === deletingCategoryId.value)
  if (index < 0) {
    deleteModalRef.value?.close()
    return
  }

  const [removed] = categories.value.splice(index, 1)
  deleting.value = true
  try {
    await deleteCategory(deletingCategoryId.value)
    toast.success('ลบหมวดหมู่เรียบร้อย')
    deleteModalRef.value?.close()
  } catch {
    categories.value.splice(index, 0, removed)
    toast.error('ไม่สามารถลบหมวดหมู่ได้')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await fetchCategories()
  form.sortOrder = nextSortOrder.value
})
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.17),transparent_34%),linear-gradient(132deg,#0f172a_0%,#134e4a_46%,#052e2b_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-emerald-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-cyan-200/10 blur-2xl" />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">Category Organizer</p>
          <h2 class="mt-2 text-2xl font-bold text-white leading-tight md:text-[30px]">จัดการหมวดหมู่สินค้า</h2>
          <p class="mt-2 text-sm text-slate-200/90">เพิ่ม จัดระเบียบ และควบคุมโครงสร้างหมวดหมู่สินค้าในระบบ</p>
        </div>
        <button type="button" class="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20" @click="openCreateModal">
          เพิ่มหมวดหมู่
        </button>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,.45)] backdrop-blur-sm md:p-5">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input v-model="query" type="text" placeholder="ค้นหาชื่อหรือ slug" class="ns-admin-input" />
        <BaseSelectDropdown v-model="statusFilter" :options="statusOptions" placeholder="เลือกสถานะ" button-class="border-slate-300" />
        <button type="button" class="ns-admin-btn ns-admin-btn-secondary" @click="fetchCategories">รีเฟรชข้อมูล</button>
      </div>
    </div>

    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50/50 px-4 py-3">
        <p class="text-sm font-semibold text-slate-800">รายการหมวดหมู่สินค้า</p>
        <p class="text-xs text-slate-500">ทั้งหมด {{ filteredCategories.length.toLocaleString('th-TH') }} รายการ</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50/90 text-slate-700">
            <tr>
              <th class="text-left px-4 py-3 font-semibold">ชื่อหมวดหมู่</th>
              <th class="text-left px-4 py-3 font-semibold">หมวดหมู่หลัก</th>
              <th class="text-left px-4 py-3 font-semibold">Slug</th>
              <th class="text-right px-4 py-3 font-semibold">ลำดับ</th>
              <th class="text-center px-4 py-3 font-semibold">สถานะ</th>
              <th class="text-right px-4 py-3 font-semibold">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td>
            </tr>
            <tr v-else-if="!filteredCategories.length">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">ไม่พบข้อมูลหมวดหมู่</td>
            </tr>
            <tr v-for="item in filteredCategories" :key="item.id" class="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-800">{{ item.name }}</p>
                <p v-if="item.description" class="mt-0.5 text-xs text-slate-500">{{ item.description }}</p>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ item.parentId ? (categoryMap[item.parentId] || '-') : '-' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ item.slug }}</td>
              <td class="px-4 py-3 text-right text-slate-700">{{ item.sortOrder }}</td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold" :class="item.isActive ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-300 bg-slate-200 text-slate-700'">
                  {{ item.isActive ? 'ใช้งาน' : 'ปิดใช้งาน' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="ns-admin-icon-btn"
                    title="แก้ไขหมวดหมู่"
                    @click="openEditModal(item)"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                    title="ลบหมวดหมู่"
                    @click="requestDelete(item.id)"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal ref="createModalRef" id="create-category-modal" title="เพิ่มหมวดหมู่สินค้า" close-label="ปิด">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">หมวดหมู่หลัก (ถ้ามี)</label>
          <div class="mt-1">
            <BaseSelectDropdown v-model="form.parentId" :options="parentCategoryOptions" placeholder="เลือกหมวดหมู่หลัก" />
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อหมวดหมู่</label>
          <input v-model="form.name" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">Slug</label>
          <input v-model="form.slug" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" @input="slugTouched = true" />
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ลำดับการแสดงผล (อัตโนมัติ)</label>
          <input v-model.number="form.sortOrder" type="number" min="0" readonly class="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-700 outline-none" />
          <p class="mt-1 text-xs text-neutral-500">ระบบกำหนดลำดับจากค่าล่าสุด + 1</p>
        </div>
        <div class="flex items-end">
          <label class="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-[#166534]" />
            เปิดใช้งานทันที
          </label>
        </div>

        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">รายละเอียด</label>
          <textarea v-model="form.description" rows="3" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
      </div>

      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn ns-admin-btn ns-admin-btn-secondary" @click="createModalRef?.close()">ยกเลิก</button>
          <button type="button" class="btn ns-admin-btn ns-admin-btn-primary border-none" :disabled="saving" @click="submitCreate">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึกหมวดหมู่' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="editModalRef" id="edit-category-modal" title="แก้ไขหมวดหมู่สินค้า" close-label="ปิด">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">หมวดหมู่หลัก (ถ้ามี)</label>
          <div class="mt-1">
            <BaseSelectDropdown v-model="editForm.parentId" :options="editParentCategoryOptions" placeholder="เลือกหมวดหมู่หลัก" />
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อหมวดหมู่</label>
          <input v-model="editForm.name" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">Slug</label>
          <input v-model="editForm.slug" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" @input="editSlugTouched = true" />
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ลำดับการแสดงผล</label>
          <input v-model.number="editForm.sortOrder" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div class="flex items-end">
          <label class="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="editForm.isActive" type="checkbox" class="h-4 w-4 accent-[#166534]" />
            เปิดใช้งาน
          </label>
        </div>

        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">รายละเอียด</label>
          <textarea v-model="editForm.description" rows="3" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
      </div>

      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn ns-admin-btn ns-admin-btn-secondary" @click="editModalRef?.close()">ยกเลิก</button>
          <button type="button" class="btn ns-admin-btn ns-admin-btn-primary border-none" :disabled="savingEdit" @click="submitEdit">
            {{ savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="deleteModalRef" id="delete-category-modal" title="ยืนยันการลบหมวดหมู่" close-label="ปิด">
      <div class="space-y-2 text-sm text-neutral-700">
        <p>คุณกำลังจะลบหมวดหมู่ <span class="font-semibold text-neutral-900">{{ deletingCategoryName || 'รายการนี้' }}</span></p>
        <p class="text-red-600">เมื่อลบแล้วจะไม่สามารถกู้คืนได้</p>
      </div>

      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn ns-admin-btn ns-admin-btn-secondary" @click="deleteModalRef?.close()">ยกเลิก</button>
          <button type="button" class="btn rounded-xl bg-red-600 hover:bg-red-700 text-white border-none" :disabled="deleting" @click="submitDelete">
            {{ deleting ? 'กำลังลบ...' : 'ยืนยันการลบ' }}
          </button>
        </div>
      </template>
    </BaseModal>
  </section>
</template>
