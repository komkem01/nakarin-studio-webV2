<script setup lang="ts">
useSeoMeta({
  title: 'บายศรี - บริการบายศรีออนไลน์ ขอพรอิทธิพล',
  description: 'บริการบายศรีชั้นนำ ครบครัน จองง่าย จ่ายสะดวก อิทธิพลแน่นอน',
})

const { listProducts, listPackages } = useCustomerApi()

const loadingProducts = ref(true)
const loadingPackages = ref(true)
const products = ref<any[]>([])
const packages = ref<any[]>([])

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
  <div class="bg-white">
    <!-- Navbar -->
    <header class="sticky top-0 z-50 border-b border-[#bbf7d0] bg-white/90 backdrop-blur">
      <UContainer>
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-[#166534] text-white flex items-center justify-center text-sm font-extrabold shadow-[0_6px_14px_-6px_rgba(22,101,52,0.7)]">N</div>
            <span class="font-bold text-[#166534] tracking-wide text-sm uppercase">Nakarin Studio</span>
          </div>
          <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
            <a href="#products" class="hover:text-[#166534] transition-colors">บริการ</a>
            <a href="#packages" class="hover:text-[#166534] transition-colors">แพคเกจ</a>
          </nav>
          <NuxtLink
            to="/booking"
            class="rounded-xl bg-[#166534] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14532d] transition-colors shadow-[0_6px_14px_-6px_rgba(22,101,52,0.7)]"
          >
            สั่งบายศรี
          </NuxtLink>
        </div>
      </UContainer>
    </header>

    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-br from-[#f0fdf4] via-white to-white">
      <!-- Decorative circles -->
      <div class="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#bbf7d0]/40 blur-3xl" />
      <div class="pointer-events-none absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[#dcfce7]/60 blur-3xl" />
      <UContainer class="relative py-24 md:py-36">
        <div class="max-w-2xl space-y-7">
          <span class="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#166534] uppercase tracking-widest">
            บริการบายศรีออนไลน์
          </span>
          <h1 class="text-4xl md:text-6xl font-bold leading-tight text-neutral-900">
            ขอพรบายศรี<br />
            <span class="text-[#166534]">ง่ายๆ ด้วยเว็บ</span>
          </h1>
          <p class="text-lg text-neutral-600 leading-relaxed max-w-lg">
            บริการบายศรีชั้นนำ ครบครัน จองง่าย จ่ายสะดวก อิทธิพลแน่นอน ในราคาที่เหมาะสม
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <NuxtLink
              to="/booking"
              class="inline-flex items-center gap-2 rounded-xl bg-[#166534] px-6 py-3 text-sm font-semibold text-white hover:bg-[#14532d] transition-colors shadow-[0_10px_24px_-10px_rgba(22,101,52,0.6)]"
            >
              สั่งบายศรีเลย
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" /></svg>
            </NuxtLink>
            <a
              href="#packages"
              class="inline-flex items-center gap-2 rounded-xl border border-[#bbf7d0] bg-white px-6 py-3 text-sm font-semibold text-[#166534] hover:bg-[#f0fdf4] transition-colors"
            >
              ดูแพคเกจทั้งหมด
            </a>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Stats Section -->
    <section class="border-y border-[#bbf7d0] bg-[#f0fdf4]">
      <UContainer class="py-10">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div class="space-y-1">
            <div class="text-3xl font-bold text-[#166534]">{{ products.length }}+</div>
            <div class="text-sm text-neutral-600">รูปแบบบายศรี</div>
          </div>
          <div class="space-y-1">
            <div class="text-3xl font-bold text-[#166534]">{{ packages.length }}+</div>
            <div class="text-sm text-neutral-600">แพคเกจพิเศษ</div>
          </div>
          <div class="space-y-1">
            <div class="text-3xl font-bold text-[#166534]">2000+</div>
            <div class="text-sm text-neutral-600">ผู้ขอพรพอใจ</div>
          </div>
          <div class="space-y-1">
            <div class="text-3xl font-bold text-[#166534]">4.9/5</div>
            <div class="text-sm text-neutral-600">คะแนนรีวิว</div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Products Section -->
    <section id="products" class="py-20 bg-white">
      <UContainer>
        <div class="text-center max-w-xl mx-auto mb-12 space-y-3">
          <span class="inline-block rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#166534] uppercase tracking-widest">บริการหลัก</span>
          <h2 class="text-3xl md:text-4xl font-bold text-neutral-900">
            รูปแบบบายศรีที่หลากหลาย
          </h2>
          <p class="text-neutral-500 text-sm">เลือกรูปแบบที่เหมาะกับงานของคุณ</p>
        </div>

        <div v-if="loadingProducts" class="flex justify-center py-20">
          <svg class="animate-spin h-8 w-8 text-[#166534]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <div v-else-if="products.length === 0" class="text-center py-12 text-neutral-400">
          ยังไม่มีรูปแบบบายศรี
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="product in products"
            :key="product.id"
            class="group rounded-xl border border-[#bbf7d0] bg-white overflow-hidden hover:shadow-[0_8px_24px_-8px_rgba(22,101,52,0.2)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div class="w-full aspect-square bg-[#f0fdf4] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.2" stroke="currentColor" class="w-14 h-14 text-[#166534]/40">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c-4.444 0-8 3.582-8 8 0 2.07.782 3.958 2.065 5.39L12 21l5.935-4.61A7.96 7.96 0 0 0 20 11c0-4.418-3.556-8-8-8Z" />
              </svg>
            </div>
            <div class="p-4 space-y-2">
              <span class="inline-block text-[11px] font-semibold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded-full">{{ product.category_name }}</span>
              <h3 class="font-semibold text-neutral-900 line-clamp-2">{{ product.name }}</h3>
              <p class="text-sm text-neutral-500 line-clamp-2">{{ product.description || 'บายศรีมงคล ขอพรสิ่งดีงาม' }}</p>
              <div class="flex items-center justify-between pt-2">
                <span class="text-lg font-bold text-[#166534]">{{ currency(product.price) }}</span>
                <span v-if="product.is_active" class="text-[11px] font-medium text-[#166534] bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#bbf7d0]">พร้อมสั่ง</span>
                <span v-else class="text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">ปิดให้บริการ</span>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Packages Section -->
    <section id="packages" class="py-20 bg-[#f0fdf4]">
      <UContainer>
        <div class="text-center max-w-xl mx-auto mb-12 space-y-3">
          <span class="inline-block rounded-full border border-[#bbf7d0] bg-white px-3 py-1 text-xs font-semibold text-[#166534] uppercase tracking-widest">แพคเกจพิเศษ</span>
          <h2 class="text-3xl md:text-4xl font-bold text-neutral-900">
            เลือกแพคเกจที่เหมาะสม
          </h2>
          <p class="text-neutral-500 text-sm">แพคเกจครบ คุ้มค่า เหมาะสำหรับทุกโอกาส</p>
        </div>

        <div v-if="loadingPackages" class="flex justify-center py-20">
          <svg class="animate-spin h-8 w-8 text-[#166534]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <div v-else-if="packages.length === 0" class="text-center py-12 text-neutral-400">
          ยังไม่มีแพคเกจบายศรี
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="pkg in packages"
            :key="pkg.id"
            class="rounded-xl border border-[#bbf7d0] bg-white p-6 hover:shadow-[0_8px_24px_-8px_rgba(22,101,52,0.2)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div class="space-y-4">
              <h3 class="text-xl font-bold text-neutral-900">{{ pkg.name }}</h3>
              <p class="text-sm text-neutral-500 leading-relaxed">{{ pkg.description || 'แพคเกจบายศรีครบครัน' }}</p>
              <div class="text-3xl font-bold text-[#166534]">{{ currency(pkg.price) }}</div>
              <div class="space-y-2 py-4 border-y border-[#bbf7d0]">
                <div v-for="item in pkg.items" :key="item.id" class="text-sm text-neutral-600 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-[#166534] shrink-0">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .044 1.06l-8 10.5a.75.75 0 0 1-1.060.044l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.06-.044Z" clip-rule="evenodd" />
                  </svg>
                  <span>{{ item.product }} x{{ item.qty }}</span>
                </div>
              </div>
              <NuxtLink
                to="/booking"
                class="block w-full text-center rounded-xl bg-[#166534] py-2.5 text-sm font-semibold text-white hover:bg-[#14532d] transition-colors shadow-[0_6px_14px_-6px_rgba(22,101,52,0.6)]"
              >
                จองบายศรี
              </NuxtLink>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-[#166534]">
      <UContainer>
        <div class="text-center space-y-6">
          <h2 class="text-3xl md:text-4xl font-bold text-white">
            พร้อมสั่งบายศรีแล้วหรือยัง?
          </h2>
          <p class="text-[#bbf7d0] text-lg max-w-lg mx-auto">
            จองออนไลน์ได้ทันที สะดวก รวดเร็ว ยืนยันภายใน 24 ชั่วโมง
          </p>
          <NuxtLink
            to="/booking"
            class="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-bold text-[#166534] hover:bg-[#f0fdf4] transition-colors shadow-[0_10px_24px_-10px_rgba(0,0,0,0.3)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M5.25 12a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75V12ZM6 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H6ZM7.25 12a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H8a.75.75 0 0 1-.75-.75V12ZM8 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H8ZM9.25 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H10a.75.75 0 0 1-.75-.75V10ZM10 11.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V12a.75.75 0 0 0-.75-.75H10ZM9.25 14a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H10a.75.75 0 0 1-.75-.75V14ZM12 9.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V10a.75.75 0 0 0-.75-.75H12ZM11.25 12a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H12a.75.75 0 0 1-.75-.75V12ZM12 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H12ZM13.25 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H14a.75.75 0 0 1-.75-.75V10ZM14 11.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V12a.75.75 0 0 0-.75-.75H14Z" /><path fill-rule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clip-rule="evenodd" /></svg>
            จองคิวออนไลน์
          </NuxtLink>
        </div>
      </UContainer>
    </section>

    <!-- Footer -->
    <footer class="border-t border-[#bbf7d0] bg-white py-8">
      <UContainer>
        <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-[#166534] text-white flex items-center justify-center text-xs font-bold">N</div>
            <span class="font-semibold text-[#166534]">Nakarin Studio</span>
          </div>
          <p>© {{ new Date().getFullYear() }} Nakarin Studio. สงวนลิขสิทธิ์ทุกประการ</p>
        </div>
      </UContainer>
    </footer>
  </div>
</template>
