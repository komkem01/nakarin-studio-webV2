<script setup lang="ts">
export interface SelectOptionItem {
  label: string
  value: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: SelectOptionItem[]
  placeholder?: string
  disabled?: boolean
  buttonClass?: string
  menuClass?: string
}>(), {
  placeholder: 'กรุณาเลือก',
  disabled: false,
  buttonClass: '',
  menuClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const detailsRef = ref<HTMLDetailsElement | null>(null)
const menuRef = ref<HTMLUListElement | null>(null)
const shouldOpenUp = ref(false)

let cleanupScrollListener: (() => void) | null = null

const getMenuHeight = () => {
  if (!menuRef.value) return 256
  const menuEl = menuRef.value
  return Math.min(menuEl.scrollHeight || 256, 256)
}

const updatePlacement = () => {
  const detailsEl = detailsRef.value
  if (!detailsEl) return

  const modalBox = detailsEl.closest('.modal-box') as HTMLElement | null
  if (!modalBox) {
    shouldOpenUp.value = false
    return
  }

  const triggerRect = detailsEl.getBoundingClientRect()
  const modalRect = modalBox.getBoundingClientRect()
  const menuHeight = getMenuHeight()
  const offset = 12

  const spaceBelow = modalRect.bottom - triggerRect.bottom - offset
  const spaceAbove = triggerRect.top - modalRect.top - offset

  shouldOpenUp.value = spaceBelow < menuHeight && spaceAbove > spaceBelow
}

const attachModalScrollListener = () => {
  const detailsEl = detailsRef.value
  if (!detailsEl) return

  const modalBox = detailsEl.closest('.modal-box') as HTMLElement | null
  if (!modalBox) return

  const onScroll = () => {
    if (detailsRef.value?.open) updatePlacement()
  }

  modalBox.addEventListener('scroll', onScroll, { passive: true })
  cleanupScrollListener = () => modalBox.removeEventListener('scroll', onScroll)
}

const onToggle = async () => {
  if (!detailsRef.value?.open) {
    shouldOpenUp.value = false
    return
  }

  await nextTick()
  updatePlacement()
}

const selectedLabel = computed(() => {
  const current = props.options.find(option => option.value === props.modelValue)
  return current?.label || props.placeholder
})

const isPlaceholder = computed(() => !props.options.some(option => option.value === props.modelValue))

const selectOption = (option: SelectOptionItem) => {
  if (props.disabled || option.disabled) return
  emit('update:modelValue', option.value)
  if (detailsRef.value) detailsRef.value.open = false
}

onMounted(() => {
  attachModalScrollListener()
  window.addEventListener('resize', updatePlacement, { passive: true })
})

onBeforeUnmount(() => {
  cleanupScrollListener?.()
  window.removeEventListener('resize', updatePlacement)
})
</script>

<template>
  <details
    ref="detailsRef"
    class="dropdown w-full"
    :class="[
      { 'opacity-60 pointer-events-none': disabled },
      shouldOpenUp ? 'dropdown-top' : '',
    ]"
    @toggle="onToggle"
  >
    <summary
      class="list-none m-0 flex w-full cursor-pointer items-center justify-between rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none transition hover:border-neutral-400"
      :class="buttonClass"
    >
      <span class="truncate" :class="isPlaceholder ? 'text-neutral-500' : 'text-neutral-800'">{{ selectedLabel }}</span>
      <svg class="ml-2 h-4 w-4 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </summary>

    <ul
      ref="menuRef"
      tabindex="-1"
      class="dropdown-content z-[80] mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg"
      :class="menuClass"
    >
      <li v-for="option in options" :key="`${option.value}-${option.label}`" class="list-none">
        <button
          type="button"
          class="w-full rounded-lg px-3 py-2 text-left text-sm transition"
          :class="[
            option.value === modelValue
              ? 'bg-[#f0fdf4] text-[#166534] font-semibold'
              : 'text-neutral-700 hover:bg-neutral-100',
            option.disabled ? 'opacity-50 cursor-not-allowed' : '',
          ]"
          :disabled="option.disabled"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>
  </details>
</template>
