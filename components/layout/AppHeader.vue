<script setup lang="ts">
const isMenuOpen = ref(false)

const navLinks = [
  { label: 'หน้าแรก', to: '/' },
  { label: 'บริการ', to: '/services' },
  { label: 'แพ็กเกจ', to: '/packages' },
  { label: 'แกลเลอรี', to: '/gallery' },
  { label: 'ติดต่อเรา', to: '/contact' },
]
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
    <UContainer>
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2">
          <UIcon name="i-lucide-camera" class="size-7 text-primary-500" />
          <span class="font-bold text-xl tracking-tight text-neutral-900 dark:text-white">
            Nakarin Studio
          </span>
        </NuxtLink>

        <!-- Desktop Nav -->
        <nav class="hidden md:flex items-center gap-1">
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            variant="ghost"
            color="neutral"
            size="sm"
          >
            {{ link.label }}
          </UButton>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <ClientOnly>
            <UColorModeButton />
          </ClientOnly>
          <UButton to="/booking" color="primary" size="sm" class="hidden md:flex">
            จองเลย
          </UButton>
          <!-- Mobile menu -->
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            class="md:hidden"
            :icon="isMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
            @click="isMenuOpen = !isMenuOpen"
          />
        </div>
      </div>

      <!-- Mobile Nav -->
      <div v-if="isMenuOpen" class="md:hidden pb-4 flex flex-col gap-1">
        <UButton
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          variant="ghost"
          color="neutral"
          class="justify-start"
          @click="isMenuOpen = false"
        >
          {{ link.label }}
        </UButton>
        <UButton to="/booking" color="primary" class="mt-2" @click="isMenuOpen = false">
          จองเลย
        </UButton>
      </div>
    </UContainer>
  </header>
</template>
