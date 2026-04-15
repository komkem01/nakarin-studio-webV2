<script setup lang="ts">
import { useAppToast } from '~/composables/useAppToast'
import BaseModalComponent from '~/components/base/BaseModal.vue'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'จัดการสินค้า - Nakarin Studio Admin' })

type ProductRow = {
  id: string
  categoryId: string
  storageId?: string | null
  categoryName: string
  name: string
  slug: string
  sku: string
  imageUrl?: string | null
  description?: string | null
  price: number
  stockQty: number
  isActive: boolean
}

const { listProducts, listCategories, createProduct, updateProduct, deleteProduct } = useAdminCatalogApi()
const { authFetch } = useAdminSession()
const toast = useAppToast()
const runtimeConfig = useRuntimeConfig()
const apiBase = String(runtimeConfig.public.apiBase || '').replace(/\/$/, '')

const loading = ref(true)
const saving = ref(false)
const savingEdit = ref(false)
const deleting = ref(false)
const uploadingCreateImage = ref(false)
const uploadingEditImage = ref(false)
const createSelectedFileName = ref('')
const editSelectedFileName = ref('')

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
  storageId: '',
  name: '',
  imageUrl: '',
  sku: '',
  description: '',
  price: 0,
  stockQty: 0,
  isActive: true,
})

const editForm = reactive({
  categoryId: '',
  storageId: '',
  name: '',
  slug: '',
  sku: '',
  imageUrl: '',
  description: '',
  price: 0,
  stockQty: 0,
  isActive: true,
})

const createModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const editModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)
const deleteModalRef = ref<InstanceType<typeof BaseModalComponent> | null>(null)

const editSlugTouched = ref(false)
const editingProductId = ref('')
const deletingProductId = ref('')

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

const buildUploadProxyUrl = (storageId: string) => `${apiBase}/api/v1/uploads/${storageId}/proxy`

const parseSignedUrlExpiryAt = (url: string): number | null => {
  try {
    const parsed = new URL(url)
    const issuedAt = parsed.searchParams.get('X-Amz-Date')
    const expiresIn = Number(parsed.searchParams.get('X-Amz-Expires') || '0')
    if (!issuedAt || !Number.isFinite(expiresIn) || expiresIn <= 0) return null
    const normalized = issuedAt.replace(/(\d{8})T(\d{6})Z/, '$1T$2Z')
    const issuedMs = Date.parse(normalized)
    if (!Number.isFinite(issuedMs)) return null
    return issuedMs + expiresIn * 1000
  } catch {
    return null
  }
}

const shouldRefreshSignedUrl = (url: string, beforeMs = 5 * 60 * 1000) => {
  const expiresAt = parseSignedUrlExpiryAt(url)
  if (!expiresAt) return false
  return Date.now() + beforeMs >= expiresAt
}

const refreshSignedUrlByStorageId = async (storageId: string) => {
  const res = await authFetch<{ data?: { url?: string } }>(`/api/v1/uploads/${storageId}`)
  return String(res?.data?.url || '').trim()
}

let signedUrlRefreshTimer: ReturnType<typeof setInterval> | null = null

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

watch(() => editForm.name, (next) => {
  if (!editSlugTouched.value) editForm.slug = toSlug(next)
})

const regenerateEditSlug = () => {
  editForm.slug = toSlug(editForm.name)
  editSlugTouched.value = false
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
  createModalRef.value?.open()
}

const resetForm = () => {
  form.name = ''
  form.storageId = ''
  form.imageUrl = ''
  createSelectedFileName.value = ''
  form.sku = ''
  form.description = ''
  form.price = 0
  form.stockQty = 0
  form.isActive = true
  if (categories.value.length) form.categoryId = categories.value[0].id
}

const submitCreate = async () => {
  if (!form.categoryId || !form.name.trim()) {
    toast.warning('กรุณากรอกข้อมูลสินค้าให้ครบ')
    return
  }

  saving.value = true
  try {
    await createProduct({
      categoryId: form.categoryId,
      storageId: form.storageId.trim() || undefined,
      name: form.name.trim(),
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
  editForm.storageId = item.storageId || ''
  editForm.name = item.name
  editForm.slug = item.slug
  editForm.sku = item.sku
  editForm.imageUrl = item.imageUrl || ''
  editForm.description = item.description || ''
  editForm.price = item.price
  editForm.stockQty = item.stockQty
  editForm.isActive = item.isActive
  editSelectedFileName.value = ''
  editSlugTouched.value = false
  editModalRef.value?.open()
}

const submitEdit = async () => {
  if (!editingProductId.value) return
  if (!editForm.categoryId || !editForm.name.trim() || !editForm.slug.trim()) {
    toast.warning('กรุณากรอกข้อมูลสินค้าให้ครบ')
    return
  }

  const index = products.value.findIndex(item => item.id === editingProductId.value)
  if (index < 0) return

  const previous = { ...products.value[index] }
  const optimistic: ProductRow = {
    ...products.value[index],
    categoryId: editForm.categoryId,
    categoryName: categoryNameMap.value[editForm.categoryId] || products.value[index].categoryName,
    storageId: editForm.storageId.trim(),
    name: editForm.name.trim(),
    slug: editForm.slug.trim(),
    sku: editForm.sku.trim(),
    imageUrl: editForm.imageUrl.trim(),
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
      storageId: optimistic.storageId || undefined,
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

const uploadProductImage = async (file: File, target: 'create' | 'edit') => {
  const isCreate = target === 'create'
  if (!file) return

  const uploadState = isCreate ? uploadingCreateImage : uploadingEditImage
  uploadState.value = true

  try {
    const fd = new FormData()
    fd.append('target', 'product_image')
    fd.append('file', file)

    const res = await authFetch<{ data?: { id?: string, url?: string } }>('/api/v1/uploads', {
      method: 'POST',
      body: fd,
    })

    const storageId = String(res?.data?.id || '').trim()
    const url = String(res?.data?.url || '').trim()
    if (!storageId || !url) throw new Error('missing-upload-data')

    const stableUrl = buildUploadProxyUrl(storageId)
    if (isCreate) {
      form.storageId = storageId
      form.imageUrl = stableUrl || url
    } else {
      editForm.storageId = storageId
      editForm.imageUrl = stableUrl || url
    }
    toast.success('อัปโหลดรูปสินค้าเรียบร้อย')
  } catch {
    toast.error('ไม่สามารถอัปโหลดรูปสินค้าได้')
  } finally {
    uploadState.value = false
  }
}

const onCreateImageChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  createSelectedFileName.value = file.name
  await uploadProductImage(file, 'create')
  input.value = ''
}

const onEditImageChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  editSelectedFileName.value = file.name
  await uploadProductImage(file, 'edit')
  input.value = ''
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

  signedUrlRefreshTimer = setInterval(async () => {
    const tasks: Array<Promise<void>> = []

    for (const item of products.value) {
      const storageId = String(item.storageId || '').trim()
      const url = String(item.imageUrl || '').trim()
      if (!storageId || !url || !shouldRefreshSignedUrl(url)) continue
      tasks.push((async () => {
        const next = await refreshSignedUrlByStorageId(storageId)
        if (next) item.imageUrl = next
      })())
    }

    const createStorageId = String(form.storageId || '').trim()
    const createUrl = String(form.imageUrl || '').trim()
    if (createStorageId && createUrl && shouldRefreshSignedUrl(createUrl)) {
      tasks.push((async () => {
        const next = await refreshSignedUrlByStorageId(createStorageId)
        if (next) form.imageUrl = next
      })())
    }

    const editStorageId = String(editForm.storageId || '').trim()
    const editUrl = String(editForm.imageUrl || '').trim()
    if (editStorageId && editUrl && shouldRefreshSignedUrl(editUrl)) {
      tasks.push((async () => {
        const next = await refreshSignedUrlByStorageId(editStorageId)
        if (next) editForm.imageUrl = next
      })())
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks)
    }
  }, 60 * 1000)
})

onUnmounted(() => {
  if (signedUrlRefreshTimer) clearInterval(signedUrlRefreshTimer)
  signedUrlRefreshTimer = null
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
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img v-if="item.imageUrl" :src="item.imageUrl" alt="product" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-500">ไม่มีรูป</div>
                  </div>
                  <p class="font-semibold text-slate-800">{{ item.name }}</p>
                </div>
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
      <div class="grid grid-cols-1 gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-cyan-50/40 p-3 md:grid-cols-2 md:p-4">
        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">หมวดหมู่</label>
          <div class="mt-1">
            <BaseSelectDropdown v-model="form.categoryId" :options="productCategoryOptions" placeholder="เลือกหมวดหมู่สินค้า" class="dropdown-top" />
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">ชื่อสินค้า</label>
          <input v-model="form.name" type="text" class="mt-1 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#166534]" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-600">Slug</label>
          <div class="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-600">
            ระบบสร้างอัตโนมัติจากชื่อสินค้า
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-neutral-600">SKU</label>
          <div class="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-600">
            ระบบสร้างอัตโนมัติ (รูปแบบ NK-xxxxxx)
          </div>
          <p class="mt-1 text-xs text-neutral-500">SKU จะถูกสร้างโดยระบบเมื่อบันทึกสินค้า</p>
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

        <fieldset class="md:col-span-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-lime-50/40 p-3.5 md:p-4">
          <legend class="px-2 text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">รูปสินค้า</legend>

          <div class="space-y-3">
            <div class="rounded-xl border border-dashed border-emerald-300/90 bg-white/90 p-3">
              <div class="mb-2 flex items-center gap-2 text-emerald-700">
                <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5-5 5 5" />
                    <path d="M12 5v12" />
                  </svg>
                </span>
                <p class="text-xs font-semibold">อัปโหลดภาพสินค้าใหม่</p>
              </div>

              <input
                id="create-product-image-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="sr-only"
                :disabled="uploadingCreateImage"
                @change="onCreateImageChange"
              />
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label
                  for="create-product-image-input"
                  class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  :class="uploadingCreateImage ? 'pointer-events-none opacity-60' : ''"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5-5 5 5" />
                    <path d="M12 5v12" />
                  </svg>
                  เลือกรูปสินค้า
                </label>
                <p class="truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 sm:flex-1">
                  {{ createSelectedFileName || 'ยังไม่ได้เลือกไฟล์' }}
                </p>
              </div>
              <p class="mt-2 text-xs text-neutral-600">รองรับ PNG, JPG, WEBP ขนาดสูงสุด 10MB</p>

              <div v-if="uploadingCreateImage" class="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span class="loading loading-spinner loading-xs" />
                กำลังอัปโหลดรูป...
              </div>
            </div>

            <div v-if="form.imageUrl" class="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-3 py-2">
                <p class="text-xs font-semibold text-emerald-800">ตัวอย่างรูปสินค้า</p>
                <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700">พร้อมใช้งาน</span>
              </div>
              <img :src="form.imageUrl" alt="preview" class="h-44 w-full object-cover" />
            </div>
            <div v-else class="rounded-xl border border-dashed border-neutral-300 bg-white/70 px-3 py-6 text-center text-xs text-neutral-500">
              ยังไม่ได้เลือกรูปสินค้า
            </div>
          </div>
        </fieldset>
      </div>

      <template #actions>
        <div class="w-full border-t border-slate-200 pt-3">
          <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="createModalRef?.close()"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              class="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(5,150,105,.8)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="saving"
              @click="submitCreate"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs" />
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              {{ saving ? 'กำลังบันทึก...' : 'บันทึกสินค้า' }}
            </button>
          </div>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="editModalRef" id="edit-product-modal" title="แก้ไขสินค้า" close-label="ปิด">
      <div class="grid grid-cols-1 gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-cyan-50/40 p-3 md:grid-cols-2 md:p-4">
        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-neutral-600">หมวดหมู่</label>
          <div class="mt-1">
            <BaseSelectDropdown v-model="editForm.categoryId" :options="productCategoryOptions" placeholder="เลือกหมวดหมู่สินค้า" class="dropdown-top" />
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
          <input v-model="editForm.sku" type="text" readonly class="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-700 outline-none" />
          <p class="mt-1 text-xs text-neutral-500">SKU ถูกสร้างจากระบบหลังบ้าน</p>
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

        <fieldset class="md:col-span-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-lime-50/40 p-3.5 md:p-4">
          <legend class="px-2 text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">รูปสินค้า</legend>

          <div class="space-y-3">
            <div class="rounded-xl border border-dashed border-emerald-300/90 bg-white/90 p-3">
              <div class="mb-2 flex items-center gap-2 text-emerald-700">
                <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5-5 5 5" />
                    <path d="M12 5v12" />
                  </svg>
                </span>
                <p class="text-xs font-semibold">เปลี่ยนภาพสินค้า</p>
              </div>

              <input
                id="edit-product-image-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="sr-only"
                :disabled="uploadingEditImage"
                @change="onEditImageChange"
              />
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label
                  for="edit-product-image-input"
                  class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  :class="uploadingEditImage ? 'pointer-events-none opacity-60' : ''"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5-5 5 5" />
                    <path d="M12 5v12" />
                  </svg>
                  เลือกรูปสินค้า
                </label>
                <p class="truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 sm:flex-1">
                  {{ editSelectedFileName || 'ยังไม่ได้เลือกไฟล์' }}
                </p>
              </div>
              <p class="mt-2 text-xs text-neutral-600">รองรับ PNG, JPG, WEBP ขนาดสูงสุด 10MB</p>

              <div v-if="uploadingEditImage" class="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span class="loading loading-spinner loading-xs" />
                กำลังอัปโหลดรูป...
              </div>
            </div>

            <div v-if="editForm.imageUrl" class="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-3 py-2">
                <p class="text-xs font-semibold text-emerald-800">รูปปัจจุบัน</p>
                <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700">แสดงผลแล้ว</span>
              </div>
              <img :src="editForm.imageUrl" alt="preview" class="h-44 w-full object-cover" />
            </div>
            <div v-else class="rounded-xl border border-dashed border-neutral-300 bg-white/70 px-3 py-6 text-center text-xs text-neutral-500">
              ยังไม่มีรูปสินค้า
            </div>
          </div>
        </fieldset>
      </div>

      <template #actions>
        <div class="w-full border-t border-slate-200 pt-3">
          <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="editModalRef?.close()"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              class="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(5,150,105,.8)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingEdit"
              @click="submitEdit"
            >
              <span v-if="savingEdit" class="loading loading-spinner loading-xs" />
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              {{ savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}
            </button>
          </div>
        </div>
      </template>
    </BaseModal>

    <BaseModal ref="deleteModalRef" id="delete-product-modal" title="ยืนยันการลบสินค้า" close-label="ปิด">
      <div class="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-3.5">
        <div class="flex items-start gap-3">
          <div class="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600">
            <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-slate-700">
              คุณกำลังจะลบสินค้า
              <span class="font-semibold text-slate-900">{{ deletingProductName || 'รายการนี้' }}</span>
            </p>
            <p class="text-xs text-red-700">เมื่อลบแล้วจะไม่สามารถกู้คืนได้</p>
          </div>
        </div>
      </div>

      <template #actions>
        <div class="w-full border-t border-slate-200 pt-3">
          <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="deleteModalRef?.close()"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              class="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(220,38,38,.9)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="deleting"
              @click="submitDelete"
            >
              <span v-if="deleting" class="loading loading-spinner loading-xs" />
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
              </svg>
              {{ deleting ? 'กำลังลบ...' : 'ยืนยันการลบ' }}
            </button>
          </div>
        </div>
      </template>
    </BaseModal>
  </section>
</template>
