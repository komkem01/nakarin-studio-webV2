<script setup lang="ts">
const props = withDefaults(defineProps<{
  id: string
  title?: string
  closeLabel?: string
  backdropClose?: boolean
}>(), {
  title: '',
  closeLabel: 'Close',
  backdropClose: true,
})

const dialogRef = ref<HTMLDialogElement | null>(null)

const open = () => {
  dialogRef.value?.showModal()
}

const close = () => {
  dialogRef.value?.close()
}

defineExpose({ open, close })
</script>

<template>
  <dialog :id="id" ref="dialogRef" class="modal modal-smooth">
    <div class="modal-box w-[92vw] max-w-lg rounded-2xl border border-neutral-200 bg-white p-0 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)] transition-all duration-300">
      <div class="px-6 pt-5 pb-4 border-b border-neutral-200 flex items-start justify-between gap-4">
        <h3 v-if="title" class="font-bold text-[1.75rem] text-neutral-900 leading-tight">{{ title }}</h3>
        <button
          type="button"
          class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all duration-200"
          aria-label="ปิดหน้าต่าง"
          @click="close"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="px-6 py-5 text-neutral-700">
        <slot />
      </div>

      <div class="modal-action mt-0 px-6 pb-6 pt-1">
        <slot name="actions">
          <form method="dialog">
            <button class="btn">{{ closeLabel }}</button>
          </form>
        </slot>
      </div>
    </div>
    <form v-if="backdropClose" method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<style scoped>
.modal-smooth[open] .modal-box {
  animation: modal-pop 220ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
}

.modal-smooth::backdrop {
  background: rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(2px);
  animation: backdrop-fade 180ms ease-out both;
}

@keyframes modal-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes backdrop-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
