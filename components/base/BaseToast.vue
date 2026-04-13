<script setup lang="ts">
import type { ToastPosition } from '~/composables/useToast'

const props = withDefaults(defineProps<{
  position?: ToastPosition
}>(), {
  position: 'top-end',
})

const { toasts, remove } = useToast()

const positionClasses = computed(() => {
  const map: Record<string, string> = {
    'top-start': 'toast-top toast-start',
    'top-center': 'toast-top toast-center',
    'top-end': 'toast-top toast-end',
    'middle-start': 'toast-middle toast-start',
    'middle-center': 'toast-middle toast-center',
    'middle-end': 'toast-middle toast-end',
    'bottom-start': 'toast-bottom toast-start',
    'bottom-center': 'toast-bottom toast-center',
    'bottom-end': 'toast-bottom toast-end',
  }
  return map[props.position] ?? 'toast-top toast-end'
})
</script>

<template>
  <div :class="['toast', positionClasses, 'z-50']">
    <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['alert', `alert-${toast.type}`, 'cursor-pointer', 'shadow-lg']"
        @click="remove(toast.id)"
      >
        <span>{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
