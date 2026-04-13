<script setup lang="ts">
defineProps<{
  label: string
  name: string
  modelValue: string
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  options: Array<{
    label: string
    value: string
  }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="name" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
      {{ label }}
      <span v-if="required" class="text-[#166534] ml-0.5">*</span>
    </label>
    <select
      :id="name"
      :name="name"
      :value="modelValue"
      :disabled="disabled"
      class="w-full px-3.5 py-3 rounded border text-sm bg-white text-neutral-900 outline-none transition
      focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]
      disabled:bg-neutral-50 disabled:text-neutral-400"
      :class="error ? 'border-red-400' : 'border-neutral-400'"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ placeholder || 'กรุณาเลือก' }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <p v-if="error" class="text-xs text-red-500" role="alert">{{ error }}</p>
  </div>
</template>
