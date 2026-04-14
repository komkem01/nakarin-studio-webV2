<script setup lang="ts">
import { useAppToast } from '~/composables/useAppToast'
import BaseModalComponent from '~/components/base/BaseModal.vue'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'จัดการแพคเกจ - Nakarin Studio Admin' })

type PackageItemFormRow = {
  productId: string
  qty: number
  sortOrder: number
}

type PackageRow = {
  id: string
  name: string
  slug: string
  description?: string | null
  price: number
  sortOrder: number
  isActive: boolean
  items: Array<{
    id: string
    productId: string
    product: string
    qty: number
    sortOrder: number
  }>
}

const { listPackages, createPackage, updatePackage, deletePackage, listProducts } = useAdminCatalogApi()
const toast = useAppToast()

const loading = ref(true)
const saving = ref(false)
const savingEdit = ref(false)
const deleting = ref(false)

const packages = ref<PackageRow[]>([])
const products = ref<Array<{ id: string, name: string, sku: string }>>([])

const filters = reactive({
  q: '',
  isActive: '',
  page: 1,
  limit: 10,
})

const meta = reactive({
  total: 0,
  page: 1,
  limit: 10,
})

const form = reactive({
  name: '',
  slug: '',
  description: '',
  price: 0,
  sortOrder: 0,
  isActive: true,
  items: [] as PackageItemFormRow[],
})

const editForm = reactive({
  name: '',
  slug: '',
  description: '',
  price: 0,
  sortOrder: 0,
  isActive: true,
  items: [] as PackageItemFormRow[],
})

const createModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const editModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const deleteModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)

const slugTouched = ref(false)
const editSlugTouched = ref(false)
const editingPackageId = ref('')
const deletingPackageId = ref('')
const createDraggingIndex = ref<number | null>(null)
const editDraggingIndex = ref<number | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10))))
const deletingPackageName = computed(() => packages.value.find(item => item.id === deletingPackageId.value)?.name || '')
const statusOptions = [
  { label: 'ทุกสถานะ', value: '' },
  { label: 'ใช้งาน', value: 'true' },
  { label: 'ปิดใช้งาน', value: 'false' },
]
const productOptions = computed(() => products.value.map(item => ({ label: `${item.name} (${item.sku})`, value: item.id })))
const packagePreviewTotal = computed(() => form.items.reduce((sum, item) => sum + Number(item.qty || 0), 0))
const editPackagePreviewTotal = computed(() => editForm.items.reduce((sum, item) => sum + Number(item.qty || 0), 0))

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const currency = (value: number) => new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
}).format(value || 0)

watch(() => form.name, (next) => {
  if (!slugTouched.value) form.slug = toSlug(next)
})

watch(() => editForm.name, (next) => {
  if (!editSlugTouched.value) editForm.slug = toSlug(next)
})

const fetchProducts = async () => {
  try {
    const res = await listProducts({ page: 1, limit: 100, isActive: 'true' })
    products.value = res.items.map(item => ({ id: item.id, name: item.name, sku: item.sku }))
  } catch {
    toast.error('ไม่สามารถโหลดรายการสินค้าได้')
  }
}

const fetchPackages = async () => {
  loading.value = true
  try {
    const res = await listPackages({
      q: filters.q,
      isActive: filters.isActive,
      page: filters.page,
      limit: filters.limit,
    })
    packages.value = res.items
    meta.total = res.total
    meta.page = res.page
    meta.limit = res.limit
  } catch {
    toast.error('ไม่สามารถโหลดข้อมูลแพคเกจได้')
  } finally {
    loading.value = false
  }
}

const applyFilter = async () => {
  filters.page = 1
  await fetchPackages()
}

const prevPage = async () => {
  if (filters.page <= 1) return
  filters.page -= 1
  await fetchPackages()
}

const nextPage = async () => {
  if (filters.page >= totalPages.value) return
  filters.page += 1
  await fetchPackages()
}

const hasDuplicateProduct = (rows: PackageItemFormRow[]) => {
  const used = new Set<string>()
  for (const row of rows) {
    if (!row.productId) continue
    if (used.has(row.productId)) return true
    used.add(row.productId)
  }
  return false
}

const resetForm = () => {
  form.name = ''
  form.slug = ''
  form.description = ''
  form.price = 0
  form.sortOrder = packages.value.length ? Math.max(...packages.value.map(item => Number(item.sortOrder || 0))) + 1 : 1
  form.isActive = true
  form.items = [{ productId: '', qty: 1, sortOrder: 1 }]
}

const openCreateModal = () => {
  slugTouched.value = false
  resetForm()
  createModalRef.value?.open()
}

const addCreateItem = () => {
  form.items.push({
    productId: '',
    qty: 1,
    sortOrder: form.items.length + 1,
  })
}

const removeCreateItem = (index: number) => {
  if (form.items.length <= 1) return
  form.items.splice(index, 1)
  form.items.forEach((item, idx) => { item.sortOrder = idx + 1 })
}

const reorderItemRows = (rows: PackageItemFormRow[], from: number, to: number) => {
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return
  const [moved] = rows.splice(from, 1)
  rows.splice(to, 0, moved)
  rows.forEach((row, index) => {
    row.sortOrder = index + 1
  })
}

const onCreateDragStart = (index: number) => {
  createDraggingIndex.value = index
}

const onCreateDrop = (index: number) => {
  if (createDraggingIndex.value === null) return
  reorderItemRows(form.items, createDraggingIndex.value, index)
  createDraggingIndex.value = null
}

const onCreateDragEnd = () => {
  createDraggingIndex.value = null
}

const submitCreate = async () => {
  if (!form.name.trim() || !form.slug.trim()) {
    toast.warning('กรุณากรอกชื่อแพคเกจและ slug')
    return
  }
  if (form.items.length === 0 || form.items.some(item => !item.productId || item.qty < 1)) {
    toast.warning('กรุณาเลือกรายการสินค้าและจำนวนให้ครบ')
    return
  }
  if (hasDuplicateProduct(form.items)) {
    toast.warning('ในแพคเกจเดียวกันไม่ควรมีสินค้าเดียวกันซ้ำ')
    return
  }

  saving.value = true
  try {
    await createPackage({
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      price: Number(form.price || 0),
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive,
      items: form.items.map((item, index) => ({
        productId: item.productId,
        qty: Number(item.qty || 1),
        sortOrder: Number(item.sortOrder || index + 1),
      })),
    })
    toast.success('เพิ่มแพคเกจเรียบร้อย')
    createModalRef.value?.close()
    await fetchPackages()
  } catch {
    toast.error('ไม่สามารถเพิ่มแพคเกจได้')
  } finally {
    saving.value = false
  }
}

const openEditModal = (item: PackageRow) => {
  editingPackageId.value = item.id
  editForm.name = item.name
  editForm.slug = item.slug
  editForm.description = item.description || ''
  editForm.price = item.price
  editForm.sortOrder = item.sortOrder
  editForm.isActive = item.isActive
  editForm.items = item.items.length
    ? item.items.map((row, index) => ({
      productId: row.productId,
      qty: row.qty,
      sortOrder: row.sortOrder || index + 1,
    }))
    : [{ productId: '', qty: 1, sortOrder: 1 }]
  editSlugTouched.value = false
  editModalRef.value?.open()
}

const addEditItem = () => {
  editForm.items.push({
    productId: '',
    qty: 1,
    sortOrder: editForm.items.length + 1,
  })
}

const removeEditItem = (index: number) => {
  if (editForm.items.length <= 1) return
  editForm.items.splice(index, 1)
  editForm.items.forEach((item, idx) => { item.sortOrder = idx + 1 })
}

const onEditDragStart = (index: number) => {
  editDraggingIndex.value = index
}

const onEditDrop = (index: number) => {
  if (editDraggingIndex.value === null) return
  reorderItemRows(editForm.items, editDraggingIndex.value, index)
  editDraggingIndex.value = null
}

const onEditDragEnd = () => {
  editDraggingIndex.value = null
}

const submitEdit = async () => {
  if (!editingPackageId.value) return
  if (!editForm.name.trim() || !editForm.slug.trim()) {
    toast.warning('กรุณากรอกชื่อแพคเกจและ slug')
    return
  }
  if (editForm.items.length === 0 || editForm.items.some(item => !item.productId || item.qty < 1)) {
    toast.warning('กรุณาเลือกรายการสินค้าและจำนวนให้ครบ')
    return
  }
  if (hasDuplicateProduct(editForm.items)) {
    toast.warning('ในแพคเกจเดียวกันไม่ควรมีสินค้าเดียวกันซ้ำ')
    return
  }

  savingEdit.value = true
  try {
    await updatePackage(editingPackageId.value, {
      name: editForm.name.trim(),
      slug: editForm.slug.trim(),
      description: editForm.description.trim(),
      price: Number(editForm.price || 0),
      sortOrder: Number(editForm.sortOrder || 0),
      isActive: editForm.isActive,
      items: editForm.items.map((item, index) => ({
        productId: item.productId,
        qty: Number(item.qty || 1),
        sortOrder: Number(item.sortOrder || index + 1),
      })),
    })
    toast.success('บันทึกการแก้ไขแพคเกจเรียบร้อย')
    editModalRef.value?.close()
    await fetchPackages()
  } catch {
    toast.error('ไม่สามารถแก้ไขแพคเกจได้')
  } finally {
    savingEdit.value = false
  }
}

const requestDelete = (id: string) => {
  deletingPackageId.value = id
  deleteModalRef.value?.open()
}

const submitDelete = async () => {
  if (!deletingPackageId.value) return

  deleting.value = true
  try {
    await deletePackage(deletingPackageId.value)
    toast.success('ลบแพคเกจเรียบร้อย')
    deleteModalRef.value?.close()
    await fetchPackages()
  } catch {
    toast.error('ไม่สามารถลบแพคเกจได้')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchProducts(), fetchPackages()])
})
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.17),transparent_34%),linear-gradient(132deg,#0f172a_0%,#3f3a1c_46%,#2f2508_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-amber-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-yellow-200/10 blur-2xl" />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">Package Builder</p>
          <h2 class="mt-2 text-2xl font-bold text-white leading-tight md:text-[30px]">จัดการแพคเกจ</h2>
          <p class="mt-2 text-sm text-slate-200/90">จัดชุดสินค้า กำหนดจำนวน และเรียงลำดับรายการในแต่ละแพคเกจ</p>
        </div>
        <button type="button" class="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20" @click="openCreateModal">
          เพิ่มแพคเกจ
        </button>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,.45)] backdrop-blur-sm md:p-5">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          v-model="filters.q"
          type="text"
          placeholder="ค้นหาชื่อแพคเกจหรือ slug"
          class="ns-admin-input"
          @keyup.enter="applyFilter"
        />
        <BaseSelectDropdown v-model="filters.isActive" :options="statusOptions" placeholder="เลือกสถานะ" button-class="border-slate-300" />
        <button type="button" class="ns-admin-btn ns-admin-btn-secondary" @click="applyFilter">
          ค้นหา
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-amber-50/50 px-4 py-3">
        <p class="text-sm font-semibold text-slate-800">รายการแพคเกจ</p>
        <p class="text-xs text-slate-500">ทั้งหมด {{ meta.total }} รายการ</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50/90 text-slate-700">
            <tr>
              <th class="text-left px-4 py-3 font-semibold">แพคเกจ</th>
              <th class="text-right px-4 py-3 font-semibold">ราคา</th>
              <th class="text-center px-4 py-3 font-semibold">จำนวนรายการ</th>
              <th class="text-right px-4 py-3 font-semibold">ลำดับ</th>
              <th class="text-center px-4 py-3 font-semibold">สถานะ</th>
              <th class="text-right px-4 py-3 font-semibold">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td>
            </tr>
            <tr v-else-if="!packages.length">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลแพคเกจ</td>
            </tr>
            <tr v-for="item in packages" :key="item.id" class="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-4 py-3 align-top">
                <p class="font-semibold text-slate-900">{{ item.name }}</p>
                <p class="mt-0.5 text-xs text-slate-500">/{{ item.slug }}</p>
                <p v-if="item.description" class="mt-1 text-xs text-slate-500">{{ item.description }}</p>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ currency(item.price) }}</td>
              <td class="px-4 py-3 text-center text-slate-700">{{ item.items.length }} รายการ</td>
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
                    title="แก้ไขแพคเกจ"
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
                    title="ลบแพคเกจ"
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

      <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
        <p>ทั้งหมด {{ meta.total }} รายการ</p>
        <div class="flex items-center gap-2">
          <button type="button" class="ns-admin-btn ns-admin-btn-secondary disabled:opacity-50" :disabled="filters.page <= 1" @click="prevPage">ก่อนหน้า</button>
          <span>หน้า {{ filters.page }} / {{ totalPages }}</span>
          <button type="button" class="ns-admin-btn ns-admin-btn-secondary disabled:opacity-50" :disabled="filters.page >= totalPages" @click="nextPage">ถัดไป</button>
        </div>
      </div>
    </div>

    <BaseModal ref="createModalRef" id="create-package-modal" title="เพิ่มแพคเกจ" close-label="ปิด">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อแพคเกจ</label>
          <input v-model="form.name" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">Slug</label>
          <input v-model="form.slug" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" @input="slugTouched = true" />
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ราคาแพคเกจ</label>
          <input v-model.number="form.price" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">ลำดับการแสดงผล</label>
          <input v-model.number="form.sortOrder" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">รายละเอียด</label>
          <textarea v-model="form.description" rows="3" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div class="md:col-span-2 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
          <label class="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-[#166534]" />
            เปิดใช้งานทันที
          </label>
          <p class="text-xs text-neutral-500">รวมจำนวนชิ้นในแพคเกจ {{ packagePreviewTotal }} ชิ้น</p>
        </div>

        <div class="md:col-span-2 space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-neutral-600">รายการสินค้าในแพคเกจ</label>
            <button type="button" class="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50" @click="addCreateItem">เพิ่มรายการ</button>
          </div>
          <p class="text-xs text-neutral-500">เลขช่องที่ 1 = จำนวนสินค้าในแพคเกจ (Qty) | เลขช่องที่ 2 = ลำดับการแสดงผล (Sort Order)</p>
          <div
            v-for="(item, index) in form.items"
            :key="`create-item-${index}`"
            class="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-neutral-200 bg-white p-2.5"
            :class="createDraggingIndex === index ? 'ring-2 ring-[#bbf7d0]' : ''"
            draggable="true"
            @dragstart="onCreateDragStart(index)"
            @dragover.prevent
            @drop.prevent="onCreateDrop(index)"
            @dragend="onCreateDragEnd"
          >
            <div class="md:col-span-1 flex items-center justify-center">
              <button type="button" class="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-lg border border-neutral-300 bg-neutral-50 text-neutral-500 active:cursor-grabbing" title="ลากเพื่อเรียงลำดับ">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                </svg>
              </button>
            </div>
            <div class="md:col-span-6">
              <p class="mb-1 text-[11px] font-semibold text-neutral-500">สินค้า</p>
              <BaseSelectDropdown v-model="item.productId" :options="productOptions" placeholder="เลือกสินค้า" />
            </div>
            <div class="md:col-span-2">
              <p class="mb-1 text-[11px] font-semibold text-neutral-500">จำนวน</p>
              <input v-model.number="item.qty" type="number" min="1" class="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#166534]" placeholder="จำนวน" />
            </div>
            <div class="md:col-span-2">
              <p class="mb-1 text-[11px] font-semibold text-neutral-500">ลำดับ</p>
              <input v-model.number="item.sortOrder" type="number" min="1" class="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#166534]" placeholder="ลำดับ" />
            </div>
            <div class="md:col-span-1 flex items-center justify-end">
              <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" :disabled="form.items.length <= 1" @click="removeCreateItem(index)">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <template #actions>
        <div class="grid w-full grid-cols-2 gap-3">
          <button type="button" class="btn ns-admin-btn ns-admin-btn-secondary" @click="createModalRef?.close()">ยกเลิก</button>
          <button type="button" class="btn ns-admin-btn ns-admin-btn-primary border-none" :disabled="saving" @click="submitCreate">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึกแพคเกจ' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="editModalRef" id="edit-package-modal" title="แก้ไขแพคเกจ" close-label="ปิด">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อแพคเกจ</label>
          <input v-model="editForm.name" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">Slug</label>
          <input v-model="editForm.slug" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" @input="editSlugTouched = true" />
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ราคาแพคเกจ</label>
          <input v-model.number="editForm.price" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">ลำดับการแสดงผล</label>
          <input v-model.number="editForm.sortOrder" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">รายละเอียด</label>
          <textarea v-model="editForm.description" rows="3" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div class="md:col-span-2 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
          <label class="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input v-model="editForm.isActive" type="checkbox" class="h-4 w-4 accent-[#166534]" />
            เปิดใช้งาน
          </label>
          <p class="text-xs text-neutral-500">รวมจำนวนชิ้นในแพคเกจ {{ editPackagePreviewTotal }} ชิ้น</p>
        </div>

        <div class="md:col-span-2 space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-neutral-600">รายการสินค้าในแพคเกจ</label>
            <button type="button" class="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50" @click="addEditItem">เพิ่มรายการ</button>
          </div>
          <p class="text-xs text-neutral-500">เลขช่องที่ 1 = จำนวนสินค้าในแพคเกจ (Qty) | เลขช่องที่ 2 = ลำดับการแสดงผล (Sort Order)</p>
          <div
            v-for="(item, index) in editForm.items"
            :key="`edit-item-${index}`"
            class="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-neutral-200 bg-white p-2.5"
            :class="editDraggingIndex === index ? 'ring-2 ring-[#bbf7d0]' : ''"
            draggable="true"
            @dragstart="onEditDragStart(index)"
            @dragover.prevent
            @drop.prevent="onEditDrop(index)"
            @dragend="onEditDragEnd"
          >
            <div class="md:col-span-1 flex items-center justify-center">
              <button type="button" class="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-lg border border-neutral-300 bg-neutral-50 text-neutral-500 active:cursor-grabbing" title="ลากเพื่อเรียงลำดับ">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                </svg>
              </button>
            </div>
            <div class="md:col-span-6">
              <p class="mb-1 text-[11px] font-semibold text-neutral-500">สินค้า</p>
              <BaseSelectDropdown v-model="item.productId" :options="productOptions" placeholder="เลือกสินค้า" />
            </div>
            <div class="md:col-span-2">
              <p class="mb-1 text-[11px] font-semibold text-neutral-500">เลขช่องที่ 1: จำนวน</p>
              <input v-model.number="item.qty" type="number" min="1" class="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#166534]" placeholder="จำนวน" />
            </div>
            <div class="md:col-span-2">
              <p class="mb-1 text-[11px] font-semibold text-neutral-500">เลขช่องที่ 2: ลำดับ</p>
              <input v-model.number="item.sortOrder" type="number" min="1" class="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#166534]" placeholder="ลำดับ" />
            </div>
            <div class="md:col-span-1 flex items-center justify-end">
              <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" :disabled="editForm.items.length <= 1" @click="removeEditItem(index)">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>
          </div>
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

    <BaseModal ref="deleteModalRef" id="delete-package-modal" title="ยืนยันการลบแพคเกจ" close-label="ปิด">
      <div class="space-y-2 text-sm text-neutral-700">
        <p>คุณกำลังจะลบแพคเกจ <span class="font-semibold text-neutral-900">{{ deletingPackageName || 'รายการนี้' }}</span></p>
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
