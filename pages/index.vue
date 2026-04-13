<script setup lang="ts">
useSeoMeta({
  title: 'Nakarin Studio - สตูดิโอถ่ายภาพมืออาชีพ',
  description: 'บริการถ่ายภาพระดับมืออาชีพ ครบทุกบริการ จองออนไลน์ได้ทันที',
})

const services = [
  {
    icon: 'i-lucide-user',
    title: 'พอร์ตเทรต',
    description: 'ถ่ายภาพบุคคล ครอบครัว และกลุ่มเพื่อน โดยช่างภาพมืออาชีพ',
  },
  {
    icon: 'i-lucide-shopping-bag',
    title: 'ถ่ายสินค้า',
    description: 'ถ่ายภาพสินค้า อาหาร และแบรนด์ ด้วยอุปกรณ์ระดับมืออาชีพ',
  },
  {
    icon: 'i-lucide-heart',
    title: 'งานแต่งงาน',
    description: 'บันทึกช่วงเวลาสำคัญในชีวิตคู่ของคุณด้วยภาพที่ทรงคุณค่า',
  },
  {
    icon: 'i-lucide-building',
    title: 'เช่าสตูดิโอ',
    description: 'พื้นที่สตูดิโอให้เช่า พร้อมอุปกรณ์ไฟ ฉากหลัง และสิ่งอำนวยความสะดวก',
  },
]

const stats = [
  { value: '500+', label: 'ลูกค้าที่ไว้วางใจ' },
  { value: '1K+', label: 'การถ่ายภาพที่สำเร็จ' },
  { value: '5+', label: 'ปีประสบการณ์' },
  { value: '4.9', label: 'คะแนนรีวิว' },
]
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-neutral-950 text-white">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-neutral-950 to-neutral-950" />
      <UContainer class="relative py-24 md:py-36">
        <div class="max-w-2xl space-y-6">
          <UBadge color="primary" variant="soft" label="สตูดิโอมืออาชีพ" />
          <h1 class="text-4xl md:text-6xl font-bold leading-tight">
            ทุกโมเมนต์สำคัญ<br />
            <span class="text-primary-400">เราพร้อมบันทึก</span>
          </h1>
          <p class="text-lg text-neutral-300 leading-relaxed">
            สตูดิโอถ่ายภาพมืออาชีพ บริการครบครัน จองง่าย รับภาพไว ในราคาที่คุ้มค่า
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <UButton to="/booking" color="primary" size="lg" trailing-icon="i-lucide-arrow-right">
              จองเลยวันนี้
            </UButton>
            <UButton to="/gallery" variant="outline" color="neutral" size="lg">
              ดูผลงาน
            </UButton>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Stats Section -->
    <section class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
      <UContainer class="py-10">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div v-for="stat in stats" :key="stat.label" class="space-y-1">
            <div class="text-3xl font-bold text-primary-500">{{ stat.value }}</div>
            <div class="text-sm text-neutral-500 dark:text-neutral-400">{{ stat.label }}</div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Services Section -->
    <section class="py-20">
      <UContainer>
        <div class="text-center max-w-xl mx-auto mb-12 space-y-3">
          <UBadge color="primary" variant="soft" label="บริการของเรา" />
          <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white">
            บริการครบ ตอบโจทย์ทุกความต้องการ
          </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <UCard
            v-for="service in services"
            :key="service.title"
            class="hover:shadow-lg transition-shadow group"
          >
            <template #header>
              <div class="p-3 rounded-xl bg-primary-50 dark:bg-primary-950 w-fit">
                <UIcon :name="service.icon" class="size-7 text-primary-500" />
              </div>
            </template>
            <h3 class="font-semibold text-lg text-neutral-900 dark:text-white mb-2">
              {{ service.title }}
            </h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {{ service.description }}
            </p>
          </UCard>
        </div>
      </UContainer>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-primary-500">
      <UContainer>
        <div class="text-center space-y-6">
          <h2 class="text-3xl md:text-4xl font-bold text-white">
            พร้อมแล้วใช่ไหม? มาถ่ายด้วยกันเลย
          </h2>
          <p class="text-primary-100 text-lg max-w-lg mx-auto">
            จองคิวได้ทันทีผ่านระบบออนไลน์ สะดวก รวดเร็ว ยืนยันภายใน 24 ชั่วโมง
          </p>
          <UButton
            to="/booking"
            color="white"
            size="lg"
            trailing-icon="i-lucide-calendar"
          >
            จองคิวออนไลน์
          </UButton>
        </div>
      </UContainer>
    </section>
  </div>
</template>
