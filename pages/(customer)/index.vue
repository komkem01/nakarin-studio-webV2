<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Nakarin Studio - รับสั่งบายศรีออนไลน์ ส่งถึงงาน',
  description: 'บายศรีทำมือ สวยงาม รับงานมงคลทุกประเภท สั่งออนไลน์ ส่งตรงถึงงาน',
})

const { listProducts, listPackages } = useCustomerApi()

const loadingProducts = ref(true)
const loadingPackages = ref(true)
const products = ref<any[]>([])
const packages = ref<any[]>([])

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name-asc'

const productFilterTag = ref('all')
const packageFilterTag = ref('all')
const productSort = ref<SortKey>('featured')
const packageSort = ref<SortKey>('featured')

const serviceHighlights = [
  'ทำมือทุกชิ้น ใส่ใจทุกรายละเอียด',
  'รับงานมงคลทุกประเภท',
  'จัดส่งตรงเวลา ยืนยันภายใน 24 ชม.',
]

const orderFlow = [
  { title: 'เลือกแบบ', desc: 'เลือกแพคเกจหรือสินค้าเดี่ยว' },
  { title: 'กรอกข้อมูล', desc: 'ระบุที่อยู่ วันงาน และหมายเหตุ' },
  { title: 'ทีมงานยืนยัน', desc: 'คอนเฟิร์มออเดอร์และนัดส่งตรงเวลา' },
]

const heroStats = computed(() => [
  { value: `${products.value.length}+`, label: 'รูปแบบบายศรี' },
  { value: `${packages.value.length}+`, label: 'แพคเกจพิเศษ' },
  { value: '2000+', label: 'ลูกค้าที่ไว้ใจ' },
  { value: '4.9/5', label: 'คะแนนรีวิว' },
])

const heroPreviewPackages = computed(() => packages.value.slice(0, 3))

const productFilterOptions = computed<Array<{ label: string; value: string }>>(() => {
  const uniqueById = new Map<string, string>()

  for (const item of products.value) {
    const categoryId = String(item?.category_id || '').trim()
    const categoryName = String(item?.category_name || '').trim()
    if (!categoryId || !categoryName || uniqueById.has(categoryId)) continue
    uniqueById.set(categoryId, categoryName)
  }

  const categories = Array.from(uniqueById.entries())
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label, 'th'))

  return [{ label: 'ทั้งหมด', value: 'all' }, ...categories]
})

const packageWorkTypeDefinitions = [
  { value: 'mongkol', label: 'งานมงคล' },
  { value: 'buat', label: 'งานบวช' },
  { value: 'wedding', label: 'งานแต่ง' },
  { value: 'other', label: 'งานอื่นๆ' },
]

const packageWorkTypeLabelMap: Record<string, string> = {
  mongkol: 'งานมงคล',
  buat: 'งานบวช',
  wedding: 'งานแต่ง',
  other: 'งานอื่นๆ',
}

const packageFilterOptions = computed<Array<{ label: string; value: string }>>(() => {
  const usedTypes = new Set(
    packages.value
      .map((item: any) => String(item?.workType || '').trim().toLowerCase())
      .filter(Boolean),
  )

  const base = packageWorkTypeDefinitions.filter((item) => usedTypes.size === 0 || usedTypes.has(item.value))
  return [{ label: 'ทั้งหมด', value: 'all' }, ...base]
})

const sortOptions: Array<{ label: string; value: SortKey }> = [
  { label: 'แนะนำ', value: 'featured' },
  { label: 'ราคาต่ำ-สูง', value: 'price-asc' },
  { label: 'ราคาสูง-ต่ำ', value: 'price-desc' },
  { label: 'ชื่อ A-Z', value: 'name-asc' },
]

const isProductCategoryMatch = (item: any, categoryId: string) => {
  if (categoryId === 'all') return true
  return String(item?.category_id || '') === categoryId
}

const isPackageWorkTypeMatch = (pkg: any, workType: string) => {
  if (workType === 'all') return true
  return String(pkg?.workType || '').trim().toLowerCase() === workType
}

const sortItems = <T extends { name?: string; price?: number }>(items: T[], sortKey: SortKey) => {
  const cloned = [...items]
  if (sortKey === 'price-asc') return cloned.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
  if (sortKey === 'price-desc') return cloned.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
  if (sortKey === 'name-asc') return cloned.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  return cloned
}

const filteredProducts = computed(() => sortItems(products.value.filter((p: any) => isProductCategoryMatch(p, productFilterTag.value)), productSort.value))
const filteredPackages = computed(() => sortItems(packages.value.filter((p: any) => isPackageWorkTypeMatch(p, packageFilterTag.value)), packageSort.value))

const currency = (v: number) => new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
}).format(v)

onMounted(async () => {
  try {
    const [pRes, kRes] = await Promise.all([
      listProducts(1, 12),
      listPackages(1, 12),
    ])
    products.value = pRes.items || []
    packages.value = kRes.items || []
  } catch (e) {
    console.error('Failed to load products/packages', e)
  } finally {
    loadingProducts.value = false
    loadingPackages.value = false
  }
})
</script>

<template>
  <div class="bg-[radial-gradient(circle_at_top,_#f0fdf4_0%,_#ffffff_46%)]">
    <!-- ─── HERO ────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute top-[-140px] left-[12%] w-72 h-72 rounded-full bg-[#bbf7d0]/30 blur-3xl" />
        <div class="absolute bottom-[-180px] right-[8%] w-[420px] h-[420px] rounded-full bg-[#86efac]/20 blur-3xl" />
      </div>

      <UContainer class="relative py-10 lg:py-14">
        <div class="grid lg:grid-cols-2 gap-6 items-stretch">
          <!-- Left green story panel -->
          <div class="relative bg-[#166534] rounded-[28px] px-8 py-12 lg:px-12 lg:py-14 overflow-hidden hero-fade-up">
            <div class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-white/10" />
            <div class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full border border-white/5" />
            <div class="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
            <div class="pointer-events-none absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5" />

            <div class="relative space-y-6 max-w-md">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white uppercase tracking-widest">บริการบายศรีออนไลน์</span>

              <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center float-soft">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.4" stroke="currentColor" class="w-7 h-7 text-white">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c-4.444 0-8 3.582-8 8 0 2.07.782 3.958 2.065 5.39L12 21l5.935-4.61A7.96 7.96 0 0 0 20 11c0-4.418-3.556-8-8-8Z" />
                </svg>
              </div>

              <div class="space-y-3">
                <h1 class="text-4xl md:text-5xl font-bold leading-tight text-white">
                  บายศรีงานมงคล<br />สั่งง่าย ส่งถึงที่
                </h1>
                <p class="text-[#bbf7d0]/80 text-base leading-relaxed max-w-sm">
                  บายศรีทำมือ คัดสรรวัสดุมงคล รับงานทุกประเภท สั่งออนไลน์แล้วรับที่งานได้เลย
                </p>
              </div>

              <div class="flex flex-wrap gap-3">
                <NuxtLink to="/booking" class="ns-ui-btn bg-white px-6 py-3 text-sm font-bold text-[#166534] hover:bg-[#f0fdf4] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)]">
                  สั่งบายศรีเลย
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" /></svg>
                </NuxtLink>
                <a href="#packages" class="ns-ui-btn items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20">ดูแพคเกจ</a>
              </div>

              <ul class="space-y-2.5 pt-1">
                <li v-for="item in serviceHighlights" :key="item" class="flex items-center gap-2.5 text-sm text-white/80">
                  <div class="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 text-white"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .044 1.06l-8 10.5a.75.75 0 0 1-1.06.044l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.06-.044Z" clip-rule="evenodd" /></svg>
                  </div>
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Right action panel -->
          <div class="space-y-5 hero-fade-up delay-100">
            <div class="grid grid-cols-2 gap-4">
              <div v-for="stat in heroStats" :key="stat.label" class="ns-ui-card p-5 text-center shadow-[0_10px_20px_-14px_rgba(22,101,52,0.35)]">
                <div class="text-2xl font-bold text-[#166534]">{{ stat.value }}</div>
                <div class="text-xs text-neutral-500 mt-1">{{ stat.label }}</div>
              </div>
            </div>

            <div class="ns-ui-card p-5 space-y-4">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">ขั้นตอนการสั่ง</p>
                <NuxtLink to="/booking" class="text-xs font-semibold text-[#166534] hover:underline">เริ่มทันที</NuxtLink>
              </div>
              <div class="space-y-3">
                <div v-for="(step, idx) in orderFlow" :key="step.title" class="flex items-start gap-3">
                  <div class="w-6 h-6 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{{ idx + 1 }}</div>
                  <div>
                    <p class="text-sm font-semibold text-neutral-900">{{ step.title }}</p>
                    <p class="text-xs text-neutral-500 mt-0.5">{{ step.desc }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="ns-ui-card-soft p-5 space-y-3">
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">แพคเกจยอดนิยม</p>
              <div v-if="loadingPackages" class="space-y-2">
                <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-[#bbf7d0]/40 animate-pulse" />
              </div>
              <div v-else-if="heroPreviewPackages.length > 0" class="space-y-2">
                <div v-for="pkg in heroPreviewPackages" :key="pkg.id" class="flex items-center justify-between gap-3 rounded-xl bg-white border border-[#bbf7d0] px-4 py-3 hover:shadow-[0_2px_8px_-4px_rgba(22,101,52,0.15)] transition-shadow cursor-default">
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-neutral-900 truncate">{{ pkg.name }}</div>
                    <div class="text-xs text-neutral-400">{{ pkg.items?.length || 0 }} รายการ</div>
                  </div>
                  <div class="shrink-0 text-sm font-bold text-[#166534]">{{ currency(pkg.price) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ─── PRODUCTS ─────────────────────────────────────────────────────── -->
    <section id="products" class="py-20 bg-transparent">
      <UContainer>
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div class="space-y-2">
            <span class="ns-ui-pill">บริการหลัก</span>
            <h2 class="text-3xl font-bold text-neutral-900">บายศรีหลายรูปแบบ<br /><span class="text-[#166534] text-2xl font-medium">เลือกตามหมวดหมู่</span></h2>
          </div>
          <NuxtLink to="/booking" class="ns-ui-btn ns-ui-btn-secondary shrink-0">สั่งเลย <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" /></svg></NuxtLink>
        </div>

        <div class="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ns-ui-card px-4 py-3 shadow-[0_12px_24px_-22px_rgba(22,101,52,0.45)]">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="opt in productFilterOptions"
              :key="opt.value"
              class="ns-ui-filter-chip"
              :class="productFilterTag === opt.value ? 'ns-ui-filter-chip-active' : ''"
              @click="productFilterTag = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-neutral-500">เรียง:</span>
            <BaseSelectDropdown
              v-model="productSort"
              :options="sortOptions"
              :button-class="'min-w-[150px] border-[#bbf7d0] bg-[#f0fdf4] hover:border-[#86efac] focus:border-[#166534] focus:bg-white'"
            />
          </div>
        </div>

        <!-- Skeleton -->
        <div v-if="loadingProducts" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <div v-for="i in 8" :key="i" class="rounded-2xl bg-neutral-100 animate-pulse aspect-[3/4]" />
        </div>
        <!-- Empty -->
        <div v-else-if="filteredProducts.length === 0" class="py-16 text-center">
          <div class="w-16 h-16 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.4" stroke="currentColor" class="w-8 h-8 text-[#166534]/40"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c-4.444 0-8 3.582-8 8 0 2.07.782 3.958 2.065 5.39L12 21l5.935-4.61A7.96 7.96 0 0 0 20 11c0-4.418-3.556-8-8-8Z" /></svg>
          </div>
          <p class="text-neutral-400">ไม่พบสินค้าในหมวดที่เลือก</p>
        </div>
        <!-- Grid -->
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-stretch">
          <div v-for="product in filteredProducts" :key="product.id" class="group h-full rounded-2xl border border-[#bbf7d0] bg-white overflow-hidden hover:shadow-[0_16px_34px_-20px_rgba(22,101,52,0.45)] hover:-translate-y-1 transition-all duration-300 flex flex-col">
            <div class="relative w-full aspect-square bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)] flex items-center justify-center overflow-hidden">
              <img v-if="product.image_url" :src="product.image_url" :alt="product.name" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.2" stroke="currentColor" class="w-12 h-12 text-[#166534]/30 group-hover:scale-110 transition-transform duration-300"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c-4.444 0-8 3.582-8 8 0 2.07.782 3.958 2.065 5.39L12 21l5.935-4.61A7.96 7.96 0 0 0 20 11c0-4.418-3.556-8-8-8Z" /></svg>
              <span v-if="!product.is_active" class="absolute inset-0 bg-neutral-900/30 flex items-center justify-center">
                <span class="text-xs font-medium text-white bg-neutral-900/60 px-2 py-0.5 rounded-full">ปิดให้บริการ</span>
              </span>
            </div>
            <div class="flex flex-1 flex-col p-4">
              <span class="inline-block text-[11px] font-semibold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded-full">{{ product.category_name || 'บายศรี' }}</span>
              <h3 class="mt-2.5 min-h-[2.6rem] font-semibold text-neutral-900 text-sm leading-snug line-clamp-2">{{ product.name }}</h3>
              <p class="mt-1 min-h-[2.25rem] text-xs text-neutral-500 line-clamp-2">{{ product.description || 'บายศรีมงคล ขอพรสิ่งดีงาม' }}</p>
              <div class="mt-auto flex items-center justify-between pt-3 border-t border-[#ecfdf3]">
                <span class="text-base font-bold text-[#166534]">{{ currency(product.price) }}</span>
                <NuxtLink to="/booking" class="inline-flex items-center gap-1 text-xs font-semibold text-[#166534] hover:underline">สั่งเลย</NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ─── PACKAGES ──────────────────────────────────────────────────────── -->
    <section id="packages" class="py-20 bg-transparent">
      <UContainer>
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div class="space-y-2">
            <span class="ns-ui-pill">แพคเกจพิเศษ</span>
            <h2 class="text-3xl font-bold text-neutral-900">แพคเกจพร้อมจัด<br /><span class="text-[#166534] text-2xl font-medium">คุ้มค่าทุกโอกาส</span></h2>
          </div>
          <NuxtLink to="/booking" class="ns-ui-btn ns-ui-btn-secondary shrink-0">ดูทั้งหมด <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" /></svg></NuxtLink>
        </div>

        <div class="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ns-ui-card px-4 py-3 shadow-[0_12px_24px_-22px_rgba(22,101,52,0.45)]">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="opt in packageFilterOptions"
              :key="`pkg-work-${opt.value}`"
              class="ns-ui-filter-chip"
              :class="packageFilterTag === opt.value ? 'ns-ui-filter-chip-active' : ''"
              @click="packageFilterTag = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-neutral-500">เรียง:</span>
            <BaseSelectDropdown
              v-model="packageSort"
              :options="sortOptions"
              :button-class="'min-w-[150px] border-[#bbf7d0] bg-[#f0fdf4] hover:border-[#86efac] focus:border-[#166534] focus:bg-white'"
            />
          </div>
        </div>

        <div v-if="loadingPackages" class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div v-for="i in 3" :key="i" class="rounded-2xl bg-white animate-pulse h-72" />
        </div>
        <div v-else-if="filteredPackages.length === 0" class="py-16 text-center text-neutral-400">ไม่พบแพคเกจในหมวดที่เลือก</div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="(pkg, i) in filteredPackages" :key="pkg.id" class="group relative rounded-2xl bg-white border p-6 hover:shadow-[0_16px_34px_-20px_rgba(22,101,52,0.45)] hover:-translate-y-1 transition-all duration-300 flex flex-col" :class="i === 0 ? 'border-[#166534] ring-2 ring-[#166534]/20' : 'border-[#bbf7d0]'">
            <div v-if="i === 0" class="absolute -top-3 left-5">
              <span class="rounded-full bg-[#166534] px-3 py-0.5 text-xs font-bold text-white shadow-[0_4px_10px_-4px_rgba(22,101,52,0.6)]">ยอดนิยม</span>
            </div>
            <div class="flex-1 space-y-4">
              <div>
                <h3 class="text-lg font-bold text-neutral-900">{{ pkg.name }}</h3>
                <p class="text-sm text-neutral-500 mt-1 leading-relaxed">{{ pkg.description || 'แพคเกจบายศรีครบครัน' }}</p>
              </div>
              <div class="text-3xl font-bold text-[#166534]">{{ currency(pkg.price) }}</div>
              <div>
                <span class="inline-flex rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">
                  {{ packageWorkTypeLabelMap[pkg.workType] || 'งานมงคล' }}
                </span>
              </div>
              <div class="space-y-2 py-4 border-y border-[#bbf7d0]">
                <div v-for="item in pkg.items" :key="item.id" class="flex items-center gap-2.5 text-sm text-neutral-600">
                  <div class="w-4 h-4 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-2.5 h-2.5 text-[#166534]"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .044 1.06l-8 10.5a.75.75 0 0 1-1.06.044l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.06-.044Z" clip-rule="evenodd" /></svg>
                  </div>
                  <span>{{ item.product }} <span class="text-neutral-400">× {{ item.qty }}</span></span>
                </div>
              </div>
            </div>
            <NuxtLink to="/booking" class="mt-5 block w-full text-center ns-ui-btn" :class="i === 0 ? 'ns-ui-btn-primary' : 'ns-ui-btn-secondary'">
              เลือกแพคเกจนี้
            </NuxtLink>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ─── CTA ───────────────────────────────────────────────────────────── -->
    <section class="py-20 bg-[#166534] relative overflow-hidden">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/10" />
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/5" />
        <div class="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
      </div>
      <UContainer class="relative">
        <div class="text-center space-y-6 max-w-xl mx-auto">
          <div class="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.4" stroke="currentColor" class="w-8 h-8 text-white"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c-4.444 0-8 3.582-8 8 0 2.07.782 3.958 2.065 5.39L12 21l5.935-4.61A7.96 7.96 0 0 0 20 11c0-4.418-3.556-8-8-8Z" /></svg>
          </div>
          <h2 class="text-3xl md:text-4xl font-bold text-white">อยากได้บายศรีสำหรับงาน?</h2>
          <p class="text-[#bbf7d0]/80 text-base">สั่งได้เลยตอนนี้ ทีมงานจะยืนยันออเดอร์ภายใน 24 ชั่วโมง</p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <NuxtLink to="/booking" class="ns-ui-btn items-center gap-2 bg-white px-8 py-3 text-sm font-bold text-[#166534] hover:bg-[#f0fdf4] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.3)]">จองคิวออนไลน์</NuxtLink>
            <a href="#products" class="ns-ui-btn items-center gap-2 border border-white/30 bg-white/10 px-8 py-3 text-sm font-semibold text-white hover:bg-white/20">ดูบริการ</a>
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>

<style scoped>
.hero-fade-up {
  animation: heroUp 0.6s ease-out both;
}

.delay-100 {
  animation-delay: 0.1s;
}

.float-soft {
  animation: floatSoft 3.2s ease-in-out infinite;
}

@keyframes heroUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes floatSoft {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style>
