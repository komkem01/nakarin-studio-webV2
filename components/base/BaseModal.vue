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
  <dialog :id="id" ref="dialogRef" class="modal">
    <div class="modal-box">
      <h3 v-if="title" class="font-bold text-lg mb-2">{{ title }}</h3>
      <slot />
      <div class="modal-action">
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
