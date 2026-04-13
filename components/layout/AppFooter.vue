<template>
  <footer class="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
    <UContainer>
      <div class="py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Brand -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-camera" class="size-6 text-primary-500" />
            <span class="font-bold text-lg text-neutral-900 dark:text-white">Nakarin Studio</span>
          </div>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            สตูดิโอถ่ายภาพมืออาชีพ บริการครบครัน สำหรับทุกโอกาสพิเศษของคุณ
          </p>
        </div>

        <!-- Links -->
        <div class="space-y-3">
          <h3 class="font-semibold text-neutral-900 dark:text-white">บริการ</h3>
          <ul class="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li><NuxtLink to="/services" class="hover:text-primary-500 transition-colors">ถ่ายภาพพอร์ตเทรต</NuxtLink></li>
            <li><NuxtLink to="/services" class="hover:text-primary-500 transition-colors">ถ่ายภาพสินค้า</NuxtLink></li>
            <li><NuxtLink to="/services" class="hover:text-primary-500 transition-colors">ถ่ายภาพงานแต่งงาน</NuxtLink></li>
            <li><NuxtLink to="/services" class="hover:text-primary-500 transition-colors">เช่าสตูดิโอ</NuxtLink></li>
          </ul>
        </div>

        <!-- Contact -->
        <div class="space-y-3">
          <h3 class="font-semibold text-neutral-900 dark:text-white">ติดต่อเรา</h3>
          <ul class="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-phone" class="size-4 shrink-0" />
              <span>02-xxx-xxxx</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="size-4 shrink-0" />
              <span>hello@nakarinstudio.com</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="size-4 shrink-0" />
              <span>กรุงเทพมหานคร</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="py-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-center text-neutral-400">
        © {{ new Date().getFullYear() }} Nakarin Studio. All rights reserved.
      </div>
    </UContainer>
  </footer>
</template>
