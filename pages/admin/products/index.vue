<script setup lang="ts">
import { useAppToast } from '~/composables/useAppToast'
import BaseModalComponent from '~/components/base/BaseModal.vue'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'จัดการสินค้า - Nakarin Studio Admin' })

type ProductRow = {
  id: string
  categoryId: string
  categoryName: string
  name: string
  slug: string
  sku: string
  description?: string | null
  price: number
  stockQty: number
  isActive: boolean
}

const { listProducts, listCategories, createProduct, updateProduct, deleteProduct, checkProductSkuDuplicate } = useAdminCatalogApi()
const toast = useAppToast()

const loading = ref(true)
const saving = ref(false)
const savingEdit = ref(false)
const deleting = ref(false)

const products = ref<ProductRow[]>([])
const categories = ref<Array<{ id: string, name: string }>>([])

const filters = reactive({
  q: '',
  categoryId: '',
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
  categoryId: '',
  name: '',
  slug: '',
  sku: '',
  description: '',
  price: 0,
  stockQty: 0,
  isActive: true,
})

const editForm = reactive({
  categoryId: '',
  name: '',
  slug: '',
  sku: '',
  description: '',
  price: 0,
  stockQty: 0,
  isActive: true,
})

const createModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const editModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const deleteModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)

const slugTouched = ref(false)
const editSlugTouched = ref(false)
const editingProductId = ref('')
const deletingProductId = ref('')
const skuCheckingCreate = ref(false)
const skuCheckingEdit = ref(false)
const skuDuplicateCreate = ref(false)
const skuDuplicateEdit = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10))))
const categoryNameMap = computed(() => Object.fromEntries(categories.value.map(item => [item.id, item.name])))
const deletingProductName = computed(() => products.value.find(item => item.id === deletingProductId.value)?.name || '')
const filterCategoryOptions = computed(() => [
  { label: 'ทุกหมวดหมู่', value: '' },
  ...categories.value.map(cat => ({ label: cat.name, value: cat.id })),
])
const statusOptions = [
  { label: 'ทุกสถานะ', value: '' },
  { label: 'ใช้งาน', value: 'true' },
  { label: 'ปิดใช้งาน', value: 'false' },
]
const productCategoryOptions = computed(() => categories.value.map(cat => ({ label: cat.name, value: cat.id })))

const CATEGORY_CACHE_KEY = 'admin:products:categories:v1'
const PRODUCTS_CACHE_PREFIX = 'admin:products:list:v1:'
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000
const PRODUCTS_CACHE_TTL_MS = 45 * 1000

const currency = (value: number) => new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
}).format(value || 0)

const readCache = <T>(key: string, ttlMs: number): T | null => {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at?: number, data?: T }
    if (!parsed?.at || Date.now() - parsed.at > ttlMs) return null
    return parsed.data ?? null
  } catch {
    return null
  }
}

const writeCache = (key: string, data: unknown) => {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // Ignore client storage errors.
  }
}

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

const regenerateCreateSlug = () => {
  form.slug = toSlug(form.name)
  slugTouched.value = false
}

const regenerateEditSlug = () => {
  editForm.slug = toSlug(editForm.name)
  editSlugTouched.value = false
}

const checkCreateSku = async () => {
  const sku = form.sku.trim()
  if (!sku) {
    skuDuplicateCreate.value = false
    skuCheckingCreate.value = false
    return false
  }

  skuCheckingCreate.value = true
  try {
    skuDuplicateCreate.value = await checkProductSkuDuplicate(sku)
    return skuDuplicateCreate.value
  } catch {
    skuDuplicateCreate.value = false
    return false
  } finally {
    skuCheckingCreate.value = false
  }
}

const checkEditSku = async () => {
  const sku = editForm.sku.trim()
  if (!sku) {
    skuDuplicateEdit.value = false
    skuCheckingEdit.value = false
    return false
  }

  skuCheckingEdit.value = true
  try {
    skuDuplicateEdit.value = await checkProductSkuDuplicate(sku, editingProductId.value || undefined)
    return skuDuplicateEdit.value
  } catch {
    skuDuplicateEdit.value = false
    return false
  } finally {
    skuCheckingEdit.value = false
  }
}

const fetchCategories = async () => {
  const cached = readCache<Array<{ id: string, name: string }>>(CATEGORY_CACHE_KEY, CATEGORY_CACHE_TTL_MS)
  if (cached?.length) {
    categories.value = cached
    if (!form.categoryId) form.categoryId = cached[0]?.id || ''
  }

  try {
    const res = await listCategories()
    const mapped = res.map(item => ({ id: item.id, name: item.name }))
    categories.value = mapped
    writeCache(CATEGORY_CACHE_KEY, mapped)
    if (!form.categoryId && categories.value.length) form.categoryId = categories.value[0].id
  } catch {
    if (!cached?.length) toast.error('ไม่สามารถโหลดหมวดหมู่สินค้าได้')
  }
}

const fetchProducts = async () => {
  const query = {
    q: filters.q,
    categoryId: filters.categoryId,
    isActive: filters.isActive,
    page: filters.page,
    limit: filters.limit,
  }
  const cacheKey = `${PRODUCTS_CACHE_PREFIX}${JSON.stringify(query)}`
  const cached = readCache<{ items: ProductRow[], total: number, page: number, limit: number }>(cacheKey, PRODUCTS_CACHE_TTL_MS)

  if (cached) {
    products.value = cached.items
    meta.total = cached.total
    meta.page = cached.page
    meta.limit = cached.limit
  }

  loading.value = !cached
  try {
    const res = await listProducts(query)
    products.value = res.items
    meta.total = res.total
    meta.page = res.page
    meta.limit = res.limit
    writeCache(cacheKey, {
      items: res.items,
      total: res.total,
      page: res.page,
      limit: res.limit,
    })
  } catch {
    if (!cached) toast.error('ไม่สามารถโหลดข้อมูลสินค้าได้')
  } finally {
    loading.value = false
  }
}

const applyFilter = async () => {
  filters.page = 1
  await fetchProducts()
}

const prevPage = async () => {
  if (filters.page <= 1) return
  filters.page -= 1
  await fetchProducts()
}

const nextPage = async () => {
  if (filters.page >= totalPages.value) return
  filters.page += 1
  await fetchProducts()
}

const openCreateModal = () => {
  slugTouched.value = false
  createModalRef.value?.open()
}

const resetForm = () => {
  form.name = ''
  form.slug = ''
  form.sku = ''
  form.description = ''
  form.price = 0
  form.stockQty = 0
  form.isActive = true
  if (categories.value.length) form.categoryId = categories.value[0].id
}

const submitCreate = async () => {
  if (!form.categoryId || !form.name.trim() || !form.slug.trim() || !form.sku.trim()) {
    toast.warning('กรุณากรอกข้อมูลสินค้าให้ครบ')
    return
  }
  const isCreateSkuDuplicate = await checkCreateSku()
  if (isCreateSkuDuplicate) {
    toast.warning('SKU นี้ถูกใช้งานแล้ว กรุณาเปลี่ยนใหม่')
    return
  }

  saving.value = true
  try {
    await createProduct({
      categoryId: form.categoryId,
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      description: form.description.trim(),
      price: Number(form.price || 0),
      stockQty: Number(form.stockQty || 0),
      isActive: form.isActive,
    })

    toast.success('เพิ่มสินค้าเรียบร้อย')
    createModalRef.value?.close()
    resetForm()
    await fetchProducts()
  } catch {
    toast.error('ไม่สามารถเพิ่มสินค้าได้')
  } finally {
    saving.value = false
  }
}

const openEditModal = (item: ProductRow) => {
  editingProductId.value = item.id
  editForm.categoryId = item.categoryId || categories.value[0]?.id || ''
  editForm.name = item.name
  editForm.slug = item.slug
  editForm.sku = item.sku
  editForm.description = item.description || ''
  editForm.price = item.price
  editForm.stockQty = item.stockQty
  editForm.isActive = item.isActive
  editSlugTouched.value = false
  skuDuplicateEdit.value = false
  skuCheckingEdit.value = false
  editModalRef.value?.open()
}

const submitEdit = async () => {
  if (!editingProductId.value) return
  if (!editForm.categoryId || !editForm.name.trim() || !editForm.slug.trim() || !editForm.sku.trim()) {
    toast.warning('กรุณากรอกข้อมูลสินค้าให้ครบ')
    return
  }
  const isEditSkuDuplicate = await checkEditSku()
  if (isEditSkuDuplicate) {
    toast.warning('SKU นี้ถูกใช้งานแล้ว กรุณาเปลี่ยนใหม่')
    return
  }

  const index = products.value.findIndex(item => item.id === editingProductId.value)
  if (index < 0) return

  const previous = { ...products.value[index] }
  const optimistic: ProductRow = {
    ...products.value[index],
    categoryId: editForm.categoryId,
    categoryName: categoryNameMap.value[editForm.categoryId] || products.value[index].categoryName,
    name: editForm.name.trim(),
    slug: editForm.slug.trim(),
    sku: editForm.sku.trim(),
    description: editForm.description.trim(),
    price: Number(editForm.price || 0),
    stockQty: Number(editForm.stockQty || 0),
    isActive: editForm.isActive,
  }

  products.value[index] = optimistic
  savingEdit.value = true
  try {
    const updated = await updateProduct(editingProductId.value, {
      categoryId: optimistic.categoryId,
      name: optimistic.name,
      slug: optimistic.slug,
      sku: optimistic.sku,
      description: optimistic.description || '',
      price: optimistic.price,
      stockQty: optimistic.stockQty,
      isActive: optimistic.isActive,
    })
    products.value[index] = updated
    toast.success('บันทึกการแก้ไขสินค้าเรียบร้อย')
    editModalRef.value?.close()
  } catch {
    products.value[index] = previous
    toast.error('ไม่สามารถแก้ไขสินค้าได้')
  } finally {
    savingEdit.value = false
  }
}

const requestDelete = (id: string) => {
  deletingProductId.value = id
  deleteModalRef.value?.open()
}

const submitDelete = async () => {
  if (!deletingProductId.value) return

  const index = products.value.findIndex(item => item.id === deletingProductId.value)
  if (index < 0) {
    deleteModalRef.value?.close()
    return
  }

  const [removed] = products.value.splice(index, 1)
  const previousTotal = meta.total
  meta.total = Math.max(0, meta.total - 1)

  deleting.value = true
  try {
    await deleteProduct(deletingProductId.value)
    toast.success('ลบสินค้าเรียบร้อย')
    deleteModalRef.value?.close()
  } catch {
    products.value.splice(index, 0, removed)
    meta.total = previousTotal
    toast.error('ไม่สามารถลบสินค้าได้')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchProducts()])
})
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.17),transparent_34%),linear-gradient(132deg,#0f172a_0%,#0f3f54_46%,#082f49_100%)] px-6 py-6 text-white shadow-[0_18px_45px_-30px_rgba(2,6,23,.95)]">
      <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-sky-200/10 blur-2xl" />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.22em] text-slate-200/90 font-semibold">Catalog Control</p>
          <h2 class="mt-2 text-2xl font-bold text-white leading-tight md:text-[30px]">จัดการสินค้า</h2>
          <p class="mt-2 text-sm text-slate-200/90">ค้นหา แก้ไข และบริหารสถานะสินค้าในคลังแบบรวมศูนย์</p>
        </div>
        <button type="button" class="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20" @click="openCreateModal">
          เพิ่มสินค้า
        </button>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,.45)] backdrop-blur-sm md:p-5">
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <input
          v-model="filters.q"
          type="text"
          placeholder="ค้นหาชื่อสินค้า หรือ SKU"
          class="ns-admin-input"
          @keyup.enter="applyFilter"
        />
        <BaseSelectDropdown v-model="filters.categoryId" :options="filterCategoryOptions" placeholder="เลือกหมวดหมู่" button-class="border-slate-300" />
        <BaseSelectDropdown v-model="filters.isActive" :options="statusOptions" placeholder="เลือกสถานะ" button-class="border-slate-300" />
        <button type="button" class="ns-admin-btn ns-admin-btn-secondary" @click="applyFilter">
          ค้นหา
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_-42px_rgba(15,23,42,.7)]">
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50/50 px-4 py-3">
        <p class="text-sm font-semibold text-slate-800">รายการสินค้า</p>
        <p class="text-xs text-slate-500">ทั้งหมด {{ meta.total.toLocaleString('th-TH') }} รายการ</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50/90 text-slate-700">
            <tr>
              <th class="text-left px-4 py-3 font-semibold">สินค้า</th>
              <th class="text-left px-4 py-3 font-semibold">หมวดหมู่</th>
              <th class="text-left px-4 py-3 font-semibold">SKU</th>
              <th class="text-right px-4 py-3 font-semibold">ราคา</th>
              <th class="text-right px-4 py-3 font-semibold">คงเหลือ</th>
              <th class="text-center px-4 py-3 font-semibold">สถานะ</th>
              <th class="text-right px-4 py-3 font-semibold">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="px-4 py-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td>
            </tr>
            <tr v-else-if="!products.length">
              <td colspan="7" class="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลสินค้า</td>
            </tr>
            <tr v-for="item in products" :key="item.id" class="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-800">{{ item.name }}</p>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ item.categoryName }}</td>
              <td class="px-4 py-3 text-slate-600">{{ item.sku }}</td>
              <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ currency(item.price) }}</td>
              <td class="px-4 py-3 text-right text-slate-700">{{ item.stockQty.toLocaleString('th-TH') }}</td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="item.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-700 border border-slate-300'">
                  {{ item.isActive ? 'ใช้งาน' : 'ปิดใช้งาน' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="ns-admin-icon-btn"
                    title="แก้ไขสินค้า"
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
                    title="ลบสินค้า"
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

      <div class="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
        <p class="text-xs text-slate-500">ทั้งหมด {{ meta.total.toLocaleString('th-TH') }} รายการ</p>
        <div class="flex items-center gap-2">
          <button type="button" class="ns-admin-btn ns-admin-btn-secondary text-xs disabled:opacity-50" :disabled="filters.page <= 1" @click="prevPage">ก่อนหน้า</button>
          <span class="text-xs text-slate-600">หน้า {{ meta.page }} / {{ totalPages }}</span>
          <button type="button" class="ns-admin-btn ns-admin-btn-secondary text-xs disabled:opacity-50" :disabled="filters.page >= totalPages" @click="nextPage">ถัดไป</button>
        </div>
      </div>
    </div>

    <BaseModal ref="createModalRef" id="create-product-modal" title="เพิ่มสินค้าใหม่" close-label="ปิด">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">หมวดหมู่</label>
          <div class="mt-1">
            <BaseSelectDropdown v-model="form.categoryId" :options="productCategoryOptions" placeholder="เลือกหมวดหมู่สินค้า" />
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อสินค้า</label>
          <input v-model="form.name" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">Slug</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model="form.slug" type="text" class="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" @input="slugTouched = true" />
            <button type="button" class="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 whitespace-nowrap" @click="regenerateCreateSlug">
              สร้างใหม่
            </button>
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">SKU</label>
          <input v-model="form.sku" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" @blur="checkCreateSku" />
          <p v-if="skuCheckingCreate" class="mt-1 text-xs text-neutral-500">กำลังตรวจสอบ SKU...</p>
          <p v-else-if="skuDuplicateCreate" class="mt-1 text-xs text-red-600">SKU นี้ถูกใช้งานแล้ว</p>
          <p v-else-if="form.sku.trim()" class="mt-1 text-xs text-green-700">SKU นี้ใช้งานได้</p>
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">ราคา</label>
          <input v-model.number="form.price" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">จำนวนคงเหลือ</label>
          <input v-model.number="form.stockQty" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
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
            {{ saving ? 'กำลังบันทึก...' : 'บันทึกสินค้า' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="editModalRef" id="edit-product-modal" title="แก้ไขสินค้า" close-label="ปิด">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">หมวดหมู่</label>
          <div class="mt-1">
            <BaseSelectDropdown v-model="editForm.categoryId" :options="productCategoryOptions" placeholder="เลือกหมวดหมู่สินค้า" />
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อสินค้า</label>
          <input v-model="editForm.name" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">Slug</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model="editForm.slug" type="text" class="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" @input="editSlugTouched = true" />
            <button type="button" class="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 whitespace-nowrap" @click="regenerateEditSlug">
              สร้างใหม่
            </button>
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">SKU</label>
          <input v-model="editForm.sku" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" @blur="checkEditSku" />
          <p v-if="skuCheckingEdit" class="mt-1 text-xs text-neutral-500">กำลังตรวจสอบ SKU...</p>
          <p v-else-if="skuDuplicateEdit" class="mt-1 text-xs text-red-600">SKU นี้ถูกใช้งานแล้ว</p>
          <p v-else-if="editForm.sku.trim()" class="mt-1 text-xs text-green-700">SKU นี้ใช้งานได้</p>
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">ราคา</label>
          <input v-model.number="editForm.price" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">จำนวนคงเหลือ</label>
          <input v-model.number="editForm.stockQty" type="number" min="0" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
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

    <BaseModal ref="deleteModalRef" id="delete-product-modal" title="ยืนยันการลบสินค้า" close-label="ปิด">
      <div class="space-y-2 text-sm text-neutral-700">
        <p>คุณกำลังจะลบสินค้า <span class="font-semibold text-neutral-900">{{ deletingProductName || 'รายการนี้' }}</span></p>
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
