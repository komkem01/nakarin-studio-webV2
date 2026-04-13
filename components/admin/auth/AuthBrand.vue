<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
}>(), {
  subtitle: '',
})
</script>

<template>
  <div class="mb-8">
    <!-- Brand lockup -->
    <div class="flex items-center gap-3 mb-6">
      <div class="flex items-center justify-center w-10 h-10 bg-[#166534] shrink-0">
        <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C8 2 5 5 5 8c0 4 4 7 7 10 3-3 7-6 7-10 0-3-2.7-6-7-6z"/>
          <path d="M12 8v4M10 10h4"/>
        </svg>
      </div>
      <div>
        <p class="text-xs font-semibold tracking-[0.2em] uppercase text-[#166534]">Nakarin Studio</p>
        <p class="text-xs text-neutral-400 tracking-wide">Management System</p>
      </div>
    </div>
    <!-- Divider -->
    <div class="flex items-center gap-3 mb-6">
      <div class="w-6 h-0.5 bg-[#166534]" />
      <div class="flex-1 h-px bg-neutral-200" />
    </div>
    <!-- Page title -->
    <h1 class="text-2xl font-bold text-neutral-900 tracking-tight">{{ title }}</h1>
    <p v-if="subtitle" class="text-sm text-neutral-500 mt-1.5">{{ subtitle }}</p>
  </div>
</template>
