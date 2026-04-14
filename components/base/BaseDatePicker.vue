<script setup lang="ts">
onMounted(async () => {
  if (import.meta.client) {
    await import('cally')
  }
})

const props = withDefaults(defineProps<{
  modelValue: string | null   // YYYY-MM-DD for date-only, ISO string for datetime
  mode?: 'date' | 'datetime'
  placeholder?: string
  disabled?: boolean
}>(), {
  mode: 'date',
  placeholder: 'เลือกวันที่',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | null): void
}>()

const open = ref(false)
const root = ref<HTMLDivElement | null>(null)

// Split stored value into date + time parts for display / editing
const datePart = computed(() => {
  if (!props.modelValue) return ''
  return props.modelValue.slice(0, 10)
})

const timePart = ref(
  props.modelValue && props.modelValue.length > 10
    ? props.modelValue.slice(11, 16)
    : '00:00'
)

watch(() => props.modelValue, (v) => {
  if (v && v.length > 10) timePart.value = v.slice(11, 16)
})

const displayLabel = computed(() => {
  if (!props.modelValue) return ''
  const d = new Date(props.modelValue)
  if (!isFinite(d.getTime())) return props.modelValue
  if (props.mode === 'date') {
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return d.toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
})

const onCalendarChange = (e: Event) => {
  const val = (e.target as HTMLElement & { value: string }).value  // YYYY-MM-DD
  if (!val) { emit('update:modelValue', null); return }
  if (props.mode === 'date') {
    emit('update:modelValue', val)
    open.value = false
  } else {
    // keep popup open for time input
    const iso = `${val}T${timePart.value}:00`
    emit('update:modelValue', iso)
  }
}

const onTimeChange = (e: Event) => {
  timePart.value = (e.target as HTMLInputElement).value
  if (datePart.value) {
    emit('update:modelValue', `${datePart.value}T${timePart.value}:00`)
  }
}

const confirmDateTime = () => {
  open.value = false
}

const clearValue = (e: MouseEvent) => {
  e.stopPropagation()
  emit('update:modelValue', null)
  timePart.value = '00:00'
}

// Close on outside click
onMounted(() => {
  const handler = (e: MouseEvent) => {
    if (root.value && !root.value.contains(e.target as Node)) {
      open.value = false
    }
  }
  document.addEventListener('mousedown', handler)
  onUnmounted(() => document.removeEventListener('mousedown', handler))
})
</script>

<template>
  <div ref="root" class="relative w-full">
    <!-- Trigger button -->
    <button
      type="button"
      :disabled="disabled"
      class="w-full h-9 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30 disabled:opacity-60 disabled:cursor-not-allowed"
      :class="open ? 'ring-2 ring-[#16a34a]/30 border-[#16a34a]/40' : ''"
      @click="open = !open"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-neutral-400 shrink-0">
        <path fill-rule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clip-rule="evenodd" />
      </svg>
      <span class="flex-1 truncate" :class="modelValue ? 'text-neutral-900' : 'text-neutral-400'">
        {{ displayLabel || placeholder }}
      </span>
      <button
        v-if="modelValue"
        type="button"
        class="text-neutral-400 hover:text-neutral-600 p-0.5 shrink-0"
        @click="clearValue"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </button>

    <!-- Calendar dropdown -->
    <div
      v-if="open"
      class="absolute z-50 mt-1 left-0"
    >
      <calendar-date
        class="cally bg-white border border-neutral-200 shadow-lg rounded-xl"
        :value="datePart || undefined"
        @change="onCalendarChange"
      >
        <svg aria-label="Previous" class="fill-current size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <svg aria-label="Next" class="fill-current size-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <calendar-month />
      </calendar-date>

      <!-- Time row (datetime mode only) -->
      <div v-if="mode === 'datetime'" class="bg-white border border-t-0 border-neutral-200 shadow-lg rounded-b-xl px-4 py-3 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-neutral-400 shrink-0">
          <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd" />
        </svg>
        <label class="text-xs text-neutral-500 shrink-0">เวลา</label>
        <input
          type="time"
          :value="timePart"
          class="flex-1 h-8 rounded-lg border border-neutral-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
          @change="onTimeChange"
        />
        <button
          type="button"
          class="inline-flex items-center rounded-lg bg-[#15803d] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#166534] transition-colors shrink-0"
          @click="confirmDateTime"
        >
          ตกลง
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
calendar-date {
  --color-accent: #15803d;
  --color-heading: #1f2937;
  --color-bg: transparent;
}
</style>
