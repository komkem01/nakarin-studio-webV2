<script setup lang="ts">
withDefaults(defineProps<{
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'outline'
}>(), {
  type: 'submit',
  variant: 'primary',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="w-full py-3 px-4 rounded text-xs font-bold uppercase tracking-[0.12em] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
    :class="variant === 'primary'
      ? 'bg-[#166534] text-white hover:bg-[#14532d] focus:ring-[#166534]/40'
      : 'border-2 border-[#166534] text-[#166534] bg-white hover:bg-[#166534] hover:text-white focus:ring-[#166534]/30'"
  >
    <span v-if="loading" class="inline-flex items-center gap-2 justify-center">
      <span class="loading loading-spinner loading-xs" />
      <slot />
    </span>
    <slot v-else />
  </button>
</template>
